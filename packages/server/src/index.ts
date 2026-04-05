import express from "express";
import cors from "cors";
import { createServer } from "http";
import { config } from "./config/index.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/error.js";
import { setupWebSocket } from "./ws/index.js";
import authRoutes from "./routes/auth.js";
import sessionRoutes from "./routes/sessions.js";
import memoryRoutes from "./routes/memory.js";
import actionRoutes from "./routes/actions.js";
import digestRoutes from "./routes/digest.js";
import modesRoutes from "./routes/modes.js";
import whisperRoutes from "./routes/whispers.js";
import memoriesRoutes from "./routes/memories.js";
import engagementRoutes from "./routes/engagement.js";
import preferencesRoutes from "./routes/preferences.js";
import statsRoutes from "./routes/stats.js";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
});

// Existing routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/actions", actionRoutes);
app.use("/api/digest", digestRoutes);

// New routes
app.use("/api/modes", modesRoutes);
app.use("/api", whisperRoutes);
app.use("/api/memories", memoriesRoutes);
app.use("/api/engagement", engagementRoutes);
app.use("/api/preferences", preferencesRoutes);
app.use("/api/stats", statsRoutes);

app.use(errorHandler);

setupWebSocket(httpServer);

async function main() {
  try {
    await prisma.$connect();
    console.log("Database connected");
  } catch (err) {
    console.warn("Database not available — running without DB connection:", (err as Error).message);
  }

  httpServer.listen(config.port, () => {
    console.log(`Angel AI server running on port ${config.port}`);
  });
}

main();
