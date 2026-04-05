import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { createMockTranscriptSegment } from "../services/transcription.js";
import { generateWhisperCards } from "../services/whisper.js";
import {
  startTranscription,
  processAudioChunk,
  stopTranscription,
  getTranscriptSegments,
  getAccumulatedTranscript,
} from "../services/deepgram.service.js";
import {
  startInferenceLoop,
  stopInferenceLoop,
  switchMode,
} from "../services/inference.service.js";
import { processPostSession } from "../services/post-session.service.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  activeSessionId?: string;
  transcriptBuffer?: Array<{ speaker: string; text: string; timestamp: number }>;
  isLiveSession?: boolean;
  activeModeId?: string;
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

    // Legacy event: session:start (keep for backward compat)
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

    // New event: session:start-live (with mode, Deepgram, and inference)
    socket.on("session:start-live", async (data: { modeId?: string; sessionId?: string }) => {
      try {
        const modeId = data.modeId || "meeting";

        let sessionId = data.sessionId;
        if (!sessionId) {
          const session = await prisma.session.create({
            data: {
              userId: socket.userId!,
              modeId,
              mode: "conversation",
              isLive: true,
              status: "active",
            },
          });
          sessionId = session.id;
        } else {
          await prisma.session.update({
            where: { id: sessionId },
            data: { isLive: true, modeId, status: "active" },
          });
        }

        socket.activeSessionId = sessionId;
        socket.isLiveSession = true;
        socket.activeModeId = modeId;
        socket.transcriptBuffer = [];
        socket.join(`session:${sessionId}`);

        // Start Deepgram transcription
        await startTranscription(
          sessionId,
          // onDelta callback
          (delta) => {
            socket.emit("transcript:delta", {
              sessionId,
              ...delta,
            });

            if (delta.isFinal && delta.text.trim()) {
              socket.emit("transcript:final", {
                sessionId,
                text: delta.text,
                speaker: delta.speaker !== undefined ? `Speaker ${delta.speaker}` : "Speaker 1",
                timestamp: delta.timestamp,
                confidence: delta.confidence,
              });

              // Add to local buffer
              if (socket.transcriptBuffer) {
                socket.transcriptBuffer.push({
                  speaker: delta.speaker !== undefined ? `Speaker ${delta.speaker}` : "Speaker 1",
                  text: delta.text,
                  timestamp: delta.timestamp,
                });
              }
            }
          },
          // onError callback
          (error) => {
            console.error(`[WS] Deepgram error for session ${sessionId}:`, error);
            socket.emit("error", { message: "Transcription error, using fallback" });
          }
        );

        // Start inference loop
        startInferenceLoop(
          sessionId,
          socket.userId!,
          modeId,
          (event) => {
            const eventType = event.type as string;
            if (eventType === "whisper:card") {
              socket.emit("whisper:card", {
                sessionId,
                card: event.card,
              });
            } else if (eventType === "inference:thinking") {
              socket.emit("inference:thinking", {});
            }
          }
        );

        socket.emit("session:live-status", {
          isLive: true,
          modeId,
          sessionId,
        });
      } catch (err) {
        socket.emit("error", {
          message: err instanceof Error ? err.message : "Failed to start live session",
        });
      }
    });

    // Audio chunk handling (works for both legacy and live sessions)
    socket.on("audio:chunk", async (data: { chunk: string } | Buffer) => {
      if (!socket.activeSessionId || !socket.transcriptBuffer) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      try {
        if (socket.isLiveSession) {
          // Live session: forward to Deepgram
          const chunk = Buffer.isBuffer(data) ? data : Buffer.from((data as { chunk: string }).chunk, "base64");
          const mockDelta = processAudioChunk(socket.activeSessionId, chunk);

          // If mock mode returned a delta, emit it
          if (mockDelta) {
            socket.emit("transcript:delta", {
              sessionId: socket.activeSessionId,
              ...mockDelta,
            });

            if (mockDelta.isFinal) {
              socket.emit("transcript:final", {
                sessionId: socket.activeSessionId,
                text: mockDelta.text,
                speaker: mockDelta.speaker !== undefined ? `Speaker ${mockDelta.speaker}` : "Speaker 1",
                timestamp: mockDelta.timestamp,
                confidence: mockDelta.confidence,
              });

              socket.transcriptBuffer.push({
                speaker: "Speaker 1",
                text: mockDelta.text,
                timestamp: mockDelta.timestamp,
              });
            }
          }
        } else {
          // Legacy mock transcription
          const segment = createMockTranscriptSegment(
            `Transcribed segment at ${new Date().toISOString()}`,
            "Speaker 1"
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
              socket.userId!
            );

            for (const card of cards) {
              socket.emit("whisper:card", {
                sessionId: socket.activeSessionId,
                card,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error processing audio chunk:", err);
      }
    });

    // Stop live session
    socket.on("session:stop-live", async () => {
      if (!socket.activeSessionId) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      try {
        const sessionId = socket.activeSessionId;

        // Stop Deepgram
        stopTranscription(sessionId);

        // Stop inference
        stopInferenceLoop(sessionId);

        socket.emit("session:live-status", {
          isLive: false,
          modeId: socket.activeModeId || "meeting",
          sessionId,
        });

        socket.emit("session:status", {
          sessionId,
          status: "processing",
        });

        // Save transcript
        const segments = getTranscriptSegments(sessionId);
        const transcript = segments.length > 0
          ? segments
          : socket.transcriptBuffer || [];

        await prisma.session.update({
          where: { id: sessionId },
          data: {
            transcript,
            status: "processing",
            isLive: false,
          },
        });

        // Run post-session processing
        try {
          const result = await processPostSession(sessionId, socket.userId!);
          socket.emit("session:status", {
            sessionId,
            status: "completed",
          });
          socket.emit("debrief:ready", {
            sessionId,
            summary: result.summary,
            memoriesExtracted: result.memoriesExtracted,
            angelSaves: result.angelSaves,
          });
        } catch (err) {
          console.error(`[WS] Post-session processing failed for ${sessionId}:`, err);
          // Still mark as completed
          await prisma.session.update({
            where: { id: sessionId },
            data: { status: "completed", isLive: false },
          });
          socket.emit("session:status", {
            sessionId,
            status: "completed",
          });
        }

        socket.leave(`session:${sessionId}`);
        socket.activeSessionId = undefined;
        socket.transcriptBuffer = undefined;
        socket.isLiveSession = false;
        socket.activeModeId = undefined;
      } catch (err) {
        socket.emit("error", {
          message: err instanceof Error ? err.message : "Failed to stop live session",
        });
      }
    });

    // Legacy session:end (keep for backward compat)
    socket.on("session:end", async () => {
      if (!socket.activeSessionId || !socket.transcriptBuffer) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      try {
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
        socket.transcriptBuffer = undefined;
      } catch (err) {
        socket.emit("error", {
          message:
            err instanceof Error ? err.message : "Failed to end session",
        });
      }
    });

    // Whisper card feedback
    socket.on("whisper:feedback", async (data: { cardId: string; helpful: boolean }) => {
      try {
        await prisma.whisperCard.update({
          where: { id: data.cardId },
          data: {
            helpful: data.helpful,
            status: data.helpful ? "helpful" : "not_helpful",
            acknowledgedAt: new Date(),
          },
        });
      } catch (err) {
        console.error("[WS] Failed to update whisper feedback:", err);
      }
    });

    // Whisper card acknowledge
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
        console.error("[WS] Failed to acknowledge whisper:", err);
      }
    });

    // Mode switch mid-session
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

        switchMode(socket.activeSessionId, data.modeId);

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
      console.log(`Client disconnected: ${socket.userId}`);

      // Clean up active sessions
      if (socket.activeSessionId) {
        stopTranscription(socket.activeSessionId);
        stopInferenceLoop(socket.activeSessionId);
      }
    });
  });

  return io;
}
