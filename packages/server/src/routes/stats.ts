import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { getStreak } from "../services/engagement.service.js";
import { getMemoryStats } from "../services/memory.service.js";

const router = Router();
router.use(authenticate);

// GET /api/stats/dashboard — enriched dashboard
router.get("/dashboard", async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;

    const [streak, memoryStats, sessionCount, modeUsage] = await Promise.all([
      getStreak(userId),
      getMemoryStats(userId),
      prisma.session.count({ where: { userId } }),
      prisma.session.groupBy({
        by: ["modeId"],
        where: { userId },
        _count: { id: true },
      }),
    ]);

    const modeUsageMap: Record<string, number> = {};
    for (const row of modeUsage) {
      modeUsageMap[row.modeId] = row._count.id;
    }

    res.json({
      success: true,
      data: {
        streak,
        memoryStats,
        totalSessions: sessionCount,
        modeUsage: modeUsageMap,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
