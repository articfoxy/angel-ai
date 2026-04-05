import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import * as actionsService from "../services/actions.js";

const router = Router();
router.use(authenticate);

const generateSchema = z.object({
  input: z.string(),
  type: z.enum([
    "email_draft",
    "memo",
    "task",
    "reminder",
    "prd",
    "summary",
  ]),
  sessionId: z.string().optional(),
});

const updateSchema = z.object({
  status: z
    .enum(["draft", "approved", "executed", "cancelled"])
    .optional(),
  output: z.any().optional(),
});

router.post("/generate", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = generateSchema.parse(req.body);
    const action = await actionsService.generateAction(
      req.userId!,
      body.input,
      body.type,
      body.sessionId
    );
    res.status(201).json({ success: true, data: action });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const offset = parseInt((req.query.offset as string) || "0", 10);
    const actions = await actionsService.listActions(
      req.userId!,
      status,
      limit,
      offset
    );
    res.json({ success: true, data: actions });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const body = updateSchema.parse(req.body);
    const action = await actionsService.updateAction(id, req.userId!, body);
    res.json({ success: true, data: action });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

router.post("/:id/execute", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const action = await actionsService.executeAction(id, req.userId!);
    res.json({ success: true, data: action });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof Error && err.message.includes("must be approved")) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
