import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import {
  searchMemoriesByVector,
  getMemoryStats,
} from "../services/memory.service.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(authenticate);

const listSchema = z.object({
  type: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// GET /api/memories - list user's memories (paginated, filterable by type)
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const params = listSchema.parse(req.query);
    const where: { userId: string; type?: string } = { userId: req.userId! };
    if (params.type) where.type = params.type;

    const [memories, total] = await Promise.all([
      prisma.memory.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: params.limit,
        skip: params.offset,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          metadata: true,
          importance: true,
          accessCount: true,
          lastAccessed: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.memory.count({ where }),
    ]);

    res.json({ success: true, data: { memories, total } });
  } catch (err) {
    next(err);
  }
});

// GET /api/memories/search?q= - semantic search
router.get("/search", async (req: AuthRequest, res: Response, next) => {
  try {
    const q = String(req.query.q || "");
    if (!q) {
      res.status(400).json({ success: false, error: "Query parameter 'q' is required" });
      return;
    }

    const limitParam = req.query.limit;
    const limit = limitParam ? Math.min(parseInt(String(limitParam), 10), 20) : 5;
    const results = await searchMemoriesByVector(req.userId!, q, limit);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/memories/stats - memory statistics
router.get("/stats", async (req: AuthRequest, res: Response, next) => {
  try {
    const stats = await getMemoryStats(req.userId!);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/memories/:id - delete a memory
router.delete("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const memory = await prisma.memory.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!memory) {
      res.status(404).json({ success: false, error: "Memory not found" });
      return;
    }

    await prisma.memory.delete({ where: { id } });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
