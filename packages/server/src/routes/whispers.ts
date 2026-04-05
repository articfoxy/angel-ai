import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// GET /api/sessions/:id/whispers — get all whisper cards for a session
router.get("/sessions/:id/whispers", async (req: AuthRequest, res: Response, next) => {
  try {
    const sessionId = req.params.id as string;

    // Verify user owns the session
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.userId! },
    });
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    const whispers = await prisma.whisperCard.findMany({
      where: { sessionId: sessionId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: whispers });
  } catch (err) {
    next(err);
  }
});

// PUT /api/whispers/:id/feedback — submit feedback
const feedbackSchema = z.object({
  helpful: z.boolean(),
});

router.put("/whispers/:id/feedback", async (req: AuthRequest, res: Response, next) => {
  try {
    const cardId = req.params.id as string;
    const body = feedbackSchema.parse(req.body);

    const card = await prisma.whisperCard.findFirst({
      where: { id: cardId, userId: req.userId! },
    });
    if (!card) {
      res.status(404).json({ success: false, error: "Whisper card not found" });
      return;
    }

    const updated = await prisma.whisperCard.update({
      where: { id: cardId },
      data: {
        status: body.helpful ? "helpful" : "not_helpful",
      },
    });

    // If helpful, record as a save
    if (body.helpful) {
      const { recordSave } = await import("../services/engagement.service.js");
      await recordSave(req.userId!, card.sessionId, "Whisper card marked helpful via API");
    }

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
