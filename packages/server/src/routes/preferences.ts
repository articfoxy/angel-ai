import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

const updateSchema = z.object({
  whisperFrequency: z.enum(["silent", "minimal", "active", "aggressive"]).optional(),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  digestEnabled: z.boolean().optional(),
  defaultMode: z.string().optional(),
  timezone: z.string().optional(),
});

// GET /api/preferences — get user preferences
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: req.userId! },
    });

    if (!prefs) {
      // Return defaults
      res.json({
        success: true,
        data: {
          whisperFrequency: "active",
          digestTime: "20:00",
          digestEnabled: true,
          defaultMode: "meeting",
          timezone: "UTC",
        },
      });
      return;
    }

    res.json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
});

// PUT /api/preferences — update user preferences
router.put("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = updateSchema.parse(req.body);

    const prefs = await prisma.userPreferences.upsert({
      where: { userId: req.userId! },
      create: {
        userId: req.userId!,
        ...body,
      },
      update: body,
    });

    res.json({ success: true, data: prefs });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

export default router;
