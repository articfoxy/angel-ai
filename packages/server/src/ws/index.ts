import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { createMockTranscriptSegment } from "../services/transcription.js";
import { generateWhisperCards } from "../services/whisper.js";
import { createDeepgramSession, type DeepgramSessionHandle, type TranscriptDelta } from "../services/deepgram.service.js";
import { initSessionInference, clearSessionInference, addTranscriptAndMaybeInfer, switchSessionMode, getSessionTranscript } from "../services/inference.service.js";
import { processSessionEnd } from "../services/post-session.service.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  activeSessionId?: string;
  activeModeId?: string;
  transcriptBuffer?: Array<{ speaker: string; text: string; timestamp: number }>;
  deepgramSession?: DeepgramSessionHandle;
}

export function setupWebSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret) as {
        userId: string;
      };
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.userId}`);

    // --- Legacy: session:start (backward compatible) ---
    socket.on("session:start", async (data: { sessionId: string }) => {
      try {
        const session = await prisma.session.findFirst({
          where: { id: data.sessionId, userId: socket.userId! },
        });

        if (!session) {
          socket.emit("error", { message: "Session not found" });
          return;
        }

        socket.activeSessionId = data.sessionId;
        socket.transcriptBuffer = [];
        socket.join(`session:${data.sessionId}`);

        socket.emit("session:status", {
          sessionId: data.sessionId,
          status: "streaming",
        });
      } catch (err) {
        socket.emit("error", {
          message: err instanceof Error ? err.message : "Failed to start session",
        });
      }
    });

    // --- New: session:start-live (with mode and Deepgram) ---
    socket.on("session:start-live", async (data: { sessionId?: string; modeId?: string }) => {
      try {
        const modeId = data.modeId ?? "meeting";

        // Create or use existing session
        let sessionId = data.sessionId;
        if (!sessionId) {
          const session = await prisma.session.create({
            data: {
              userId: socket.userId!,
              mode: "live",
              modeId,
              isLive: true,
              title: `Live session - ${new Date().toLocaleDateString()}`,
            },
          });
          sessionId = session.id;
        } else {
          await prisma.session.update({
            where: { id: sessionId },
            data: { isLive: true, modeId },
          });
        }

        socket.activeSessionId = sessionId;
        socket.activeModeId = modeId;
        socket.transcriptBuffer = [];
        socket.join(`session:${sessionId}`);

        // Initialize inference pipeline
        initSessionInference(sessionId, modeId);

        // Start Deepgram session
        socket.deepgramSession = createDeepgramSession(
          (delta: TranscriptDelta) => {
            // Emit transcript events
            if (delta.isFinal) {
              socket.emit("transcript:final", {
                text: delta.text,
                speaker: delta.speaker,
                timestamp: delta.timestamp,
                confidence: delta.confidence,
              });
            } else {
              socket.emit("transcript:delta", {
                text: delta.text,
                isFinal: false,
                speaker: delta.speaker,
                timestamp: delta.timestamp,
                confidence: delta.confidence,
              });
            }

            // Feed to inference pipeline (only final segments)
            if (delta.isFinal && sessionId) {
              socket.transcriptBuffer?.push({
                speaker: delta.speaker !== undefined ? `Speaker ${delta.speaker}` : "Speaker",
                text: delta.text,
                timestamp: delta.timestamp,
              });

              addTranscriptAndMaybeInfer(
                sessionId,
                socket.userId!,
                delta.text,
                delta.speaker,
                io,
              ).catch((err) => console.error("Inference error:", err));
            }
          },
          (error: Error) => {
            socket.emit("error", { message: `Transcription error: ${error.message}` });
          },
        );

        socket.emit("session:live-status", { isLive: true, modeId, sessionId });
      } catch (err) {
        socket.emit("error", {
          message: err instanceof Error ? err.message : "Failed to start live session",
        });
      }
    });

    // --- audio:chunk (enhanced to forward to Deepgram) ---
    socket.on("audio:chunk", async (data: Buffer | { chunk: string }) => {
      if (!socket.activeSessionId || !socket.transcriptBuffer) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      try {
        // If we have a Deepgram session, forward audio
        if (socket.deepgramSession?.isOpen()) {
          const audioBuffer = Buffer.isBuffer(data)
            ? data
            : Buffer.from((data as { chunk: string }).chunk, "base64");
          socket.deepgramSession.send(audioBuffer);
          return;
        }

        // Fallback: mock transcription (legacy behavior)
        const segment = createMockTranscriptSegment(
          `Transcribed segment at ${new Date().toISOString()}`,
          "Speaker 1",
        );

        socket.transcriptBuffer.push(segment);

        socket.emit("transcript:update", {
          sessionId: socket.activeSessionId,
          segment,
          totalSegments: socket.transcriptBuffer.length,
        });

        if (socket.transcriptBuffer.length % 10 === 0) {
          const transcriptText = socket.transcriptBuffer
            .map((s) => `${s.speaker}: ${s.text}`)
            .join("\n");

          const cards = await generateWhisperCards(
            socket.activeSessionId,
            transcriptText,
            socket.userId!,
          );

          for (const card of cards) {
            socket.emit("whisper:card", {
              sessionId: socket.activeSessionId,
              card,
            });
          }
        }
      } catch (err) {
        console.error("Error processing audio chunk:", err);
      }
    });

    // --- session:stop-live (new: triggers post-processing) ---
    socket.on("session:stop-live", async () => {
      if (!socket.activeSessionId) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      const sessionId = socket.activeSessionId;
      const modeId = socket.activeModeId ?? "meeting";

      try {
        // Close Deepgram connection
        socket.deepgramSession?.close();
        socket.deepgramSession = undefined;

        socket.emit("session:live-status", { isLive: false, modeId, sessionId });

        // Run post-session processing
        const result = await processSessionEnd(sessionId, socket.userId!, modeId);

        socket.emit("session:status", {
          sessionId,
          status: "completed",
          summary: result.summary,
          memoriesExtracted: result.memoriesExtracted,
          savesDetected: result.savesDetected,
        });

        socket.emit("debrief:ready", { sessionId });

        socket.leave(`session:${sessionId}`);
        socket.activeSessionId = undefined;
        socket.activeModeId = undefined;
        socket.transcriptBuffer = undefined;
      } catch (err) {
        socket.emit("error", {
          message: err instanceof Error ? err.message : "Failed to stop live session",
        });
      }
    });

    // --- Legacy: session:end (backward compatible) ---
    socket.on("session:end", async () => {
      if (!socket.activeSessionId || !socket.transcriptBuffer) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      try {
        socket.deepgramSession?.close();
        socket.deepgramSession = undefined;

        socket.emit("session:status", {
          sessionId: socket.activeSessionId,
          status: "processing",
        });

        await prisma.session.update({
          where: { id: socket.activeSessionId },
          data: {
            transcript: socket.transcriptBuffer,
          },
        });

        socket.emit("session:status", {
          sessionId: socket.activeSessionId,
          status: "completed",
        });

        socket.emit("debrief:ready", {
          sessionId: socket.activeSessionId,
        });

        socket.leave(`session:${socket.activeSessionId}`);
        socket.activeSessionId = undefined;
        socket.activeModeId = undefined;
        socket.transcriptBuffer = undefined;
      } catch (err) {
        socket.emit("error", {
          message:
            err instanceof Error ? err.message : "Failed to end session",
        });
      }
    });

    // --- whisper:feedback ---
    socket.on("whisper:feedback", async (data: { cardId: string; helpful: boolean }) => {
      try {
        await prisma.whisperCard.update({
          where: { id: data.cardId },
          data: {
            status: data.helpful ? "helpful" : "not_helpful",
          },
        });

        if (data.helpful && socket.activeSessionId) {
          const { recordSave } = await import("../services/engagement.service.js");
          await recordSave(socket.userId!, socket.activeSessionId, "Whisper card marked helpful");
        }
      } catch (err) {
        console.error("Error recording whisper feedback:", err);
      }
    });

    // --- whisper:acknowledge ---
    socket.on("whisper:acknowledge", async (data: { cardId: string }) => {
      try {
        await prisma.whisperCard.update({
          where: { id: data.cardId },
          data: {
            status: "seen",
            acknowledgedAt: new Date(),
          },
        });
      } catch (err) {
        console.error("Error acknowledging whisper:", err);
      }
    });

    // --- mode:switch ---
    socket.on("mode:switch", async (data: { modeId: string }) => {
      if (!socket.activeSessionId) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      try {
        socket.activeModeId = data.modeId;

        await prisma.session.update({
          where: { id: socket.activeSessionId },
          data: { modeId: data.modeId },
        });

        switchSessionMode(socket.activeSessionId, data.modeId);

        socket.emit("session:live-status", {
          isLive: true,
          modeId: data.modeId,
          sessionId: socket.activeSessionId,
        });
      } catch (err) {
        socket.emit("error", {
          message: err instanceof Error ? err.message : "Failed to switch mode",
        });
      }
    });

    socket.on("disconnect", () => {
      // Clean up Deepgram connection
      socket.deepgramSession?.close();
      if (socket.activeSessionId) {
        clearSessionInference(socket.activeSessionId);
      }
      console.log(`Client disconnected: ${socket.userId}`);
    });
  });

  return io;
}
