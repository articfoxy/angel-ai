import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { getStreak } from "../services/engagement.service.js";
import { getMemoryStats } from "../services/memory.service.js";

const router = Router();
router.use(authenticate);

// GET /api/stats/dashboard - enriched dashboard stats
router.get("/dashboard", async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.userId!;

    const [streak, memoryStats, sessionCount, recentSessions, modeUsage] = await Promise.all([
      getStreak(userId),
      getMemoryStats(userId),
      prisma.session.count({ where: { userId } }),
      prisma.session.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          modeId: true,
          status: true,
          startedAt: true,
          endedAt: true,
        },
      }),
      prisma.session.groupBy({
        by: ["modeId"],
        where: { userId },
        _count: true,
      }),
    ]);

    const modeUsageMap: Record<string, number> = {};
    for (const group of modeUsage) {
      modeUsageMap[group.modeId] = group._count;
    }

    res.json({
      success: true,
      data: {
        streak,
        memoryStats,
        totalSessions: sessionCount,
        recentSessions,
        modeUsage: modeUsageMap,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
