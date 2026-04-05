import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import * as memoryService from "../services/memory.js";

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  type: z.string(),
  name: z.string(),
  content: z.any(),
  tags: z.array(z.string()).optional(),
  sourceSessionId: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().optional(),
  content: z.any().optional(),
  tags: z.array(z.string()).optional(),
  type: z.string().optional(),
});

router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const query = req.query.query as string | undefined;
    const type = req.query.type as string | undefined;
    const memories = await memoryService.searchMemories(
      req.userId!,
      query,
      type
    );
    res.json({ success: true, data: memories });
  } catch (err) {
    next(err);
  }
});

router.get("/people", async (req: AuthRequest, res: Response, next) => {
  try {
    const people = await memoryService.getPeople(req.userId!);
    res.json({ success: true, data: people });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/context/:name",
  async (req: AuthRequest, res: Response, next) => {
    try {
      const name = req.params.name as string;
      const context = await memoryService.getContextByName(
        req.userId!,
        name
      );
      res.json({ success: true, data: context });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const memory = await memoryService.getMemoryById(id, req.userId!);
    if (!memory) {
      res.status(404).json({ success: false, error: "Memory not found" });
      return;
    }
    res.json({ success: true, data: memory });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = createSchema.parse(req.body);
    const memory = await memoryService.createMemory(req.userId!, {
      type: body.type,
      name: body.name,
      content: body.content,
      tags: body.tags,
      sourceSessionId: body.sourceSessionId,
    });
    res.status(201).json({ success: true, data: memory });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const body = updateSchema.parse(req.body);
    const memory = await memoryService.updateMemory(id, req.userId!, body);
    res.json({ success: true, data: memory });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

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
