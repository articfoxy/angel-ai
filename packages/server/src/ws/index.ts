import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";
import { createMockTranscriptSegment } from "../services/transcription.js";
import { generateWhisperCards } from "../services/whisper.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  activeSessionId?: string;
  transcriptBuffer?: Array<{ speaker: string; text: string; timestamp: number }>;
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

    socket.on("audio:chunk", async (data: { chunk: string }) => {
      if (!socket.activeSessionId || !socket.transcriptBuffer) {
        socket.emit("error", { message: "No active session" });
        return;
      }

      try {
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
      } catch (err) {
        console.error("Error processing audio chunk:", err);
      }
    });

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

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.userId}`);
    });
  });

  return io;
}
