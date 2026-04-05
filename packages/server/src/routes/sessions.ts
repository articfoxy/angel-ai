import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { extractFromTranscript } from "../services/extraction.js";

const router = Router();
router.use(authenticate);

function paramId(req: AuthRequest): string {
  return req.params.id as string;
}

const createSchema = z.object({
  mode: z.enum(["conversation", "walk_and_think"]).default("conversation"),
  title: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  status: z.string().optional(),
});

const listSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  status: z.string().optional(),
});

router.post("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = createSchema.parse(req.body);
    const session = await prisma.session.create({
      data: {
        userId: req.userId!,
        mode: body.mode,
        title: body.title,
      },
    });
    res.status(201).json({ success: true, data: session });
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
    const params = listSchema.parse(req.query);
    const where: any = { userId: req.userId! };
    if (params.status) where.status = params.status;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: params.limit,
        skip: params.offset,
        select: {
          id: true,
          title: true,
          mode: true,
          status: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
        },
      }),
      prisma.session.count({ where }),
    ]);

    res.json({ success: true, data: { sessions, total } });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req);
    const session = await prisma.session.findFirst({
      where: { id, userId: req.userId! },
      include: { whisperCards: true, actions: true },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req);
    const body = updateSchema.parse(req.body);
    const session = await prisma.session.update({
      where: { id, userId: req.userId! },
      data: body,
    });
    res.json({ success: true, data: session });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

router.post("/:id/end", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req);
    const session = await prisma.session.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    if (session.status !== "active") {
      res.status(400).json({ success: false, error: "Session is not active" });
      return;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { status: "processing", endedAt: new Date() },
    });

    let extraction: any = {};
    if (session.transcript) {
      const segments = session.transcript as Array<{
        speaker: string;
        text: string;
      }>;
      const text = segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");
      extraction = await extractFromTranscript(text);
    }

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: {
        status: "completed",
        summary: extraction.summary || null,
        participants: extraction.participants || null,
        keyFacts: extraction.keyFacts || null,
        promises: extraction.promises || null,
        actionItems: extraction.actionItems || null,
        risks: extraction.risks || null,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response, next) => {
  try {
    const id = paramId(req);
    await prisma.whisperCard.deleteMany({
      where: {
        session: { id, userId: req.userId! },
      },
    });
    await prisma.action.deleteMany({
      where: { sessionId: id, userId: req.userId! },
    });
    await prisma.session.delete({
      where: { id, userId: req.userId! },
    });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
