import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import * as memoryService from "../services/memory.service.js";

const router = Router();
router.use(authenticate);

// GET /api/memories — list user's memories (paginated, filterable by type)
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const offset = parseInt((req.query.offset as string) || "0", 10);

    const result = await memoryService.listMemories(req.userId!, type, limit, offset);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/memories/search?q= — semantic search
router.get("/search", async (req: AuthRequest, res: Response, next) => {
  try {
    const rawQuery = req.query.q;
    const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
    if (!query || typeof query !== "string") {
      res.status(400).json({ success: false, error: "Query parameter 'q' is required" });
      return;
    }

    const limit = parseInt((req.query.limit as string) || "5", 10);
    const memories = await memoryService.searchMemories(req.userId!, query, limit);
    res.json({ success: true, data: memories });
  } catch (err) {
    next(err);
  }
});

// GET /api/memories/stats — memory stats
router.get("/stats", async (req: AuthRequest, res: Response, next) => {
  try {
    const stats = await memoryService.getMemoryStats(req.userId!);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/memories/:id — delete a memory
router.delete("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    await memoryService.deleteMemory(id, req.userId!);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
