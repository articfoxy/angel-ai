import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// GET /api/sessions/:id/whispers - get all whisper cards for a session
router.get("/sessions/:id/whispers", async (req: AuthRequest, res: Response, next) => {
  try {
    const sessionId = String(req.params.id);

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.userId! },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    const whispers = await prisma.whisperCard.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: whispers });
  } catch (err) {
    next(err);
  }
});

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

// PUT /api/whispers/:id/feedback - submit feedback
router.put("/whispers/:id/feedback", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const { helpful } = feedbackSchema.parse(req.body);

    const card = await prisma.whisperCard.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!card) {
      res.status(404).json({ success: false, error: "Whisper card not found" });
      return;
    }

    const updated = await prisma.whisperCard.update({
      where: { id },
      data: {
        helpful,
        status: helpful ? "helpful" : "not_helpful",
        acknowledgedAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

export default router;
