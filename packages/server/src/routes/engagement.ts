import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import * as engagementService from "../services/engagement.service.js";

const router = Router();
router.use(authenticate);

// GET /api/engagement/streak — get streak data
router.get("/streak", async (req: AuthRequest, res: Response, next) => {
  try {
    const streak = await engagementService.getStreak(req.userId!);
    res.json({ success: true, data: streak });
  } catch (err) {
    next(err);
  }
});

// GET /api/engagement/digest — get today's digest (or generate)
router.get("/digest", async (req: AuthRequest, res: Response, next) => {
  try {
    const digest = await engagementService.generateDailyDigest(req.userId!);
    res.json({ success: true, data: { digest } });
  } catch (err) {
    next(err);
  }
});

export default router;
