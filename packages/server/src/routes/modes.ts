import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import * as modesService from "../services/modes.service.js";

const router = Router();
router.use(authenticate);

// GET /api/modes — list all available modes with user settings
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const modes = await modesService.getAllModes(req.userId!);
    res.json({ success: true, data: modes });
  } catch (err) {
    next(err);
  }
});

// GET /api/modes/:modeId — get specific mode config
router.get("/:modeId", async (req: AuthRequest, res: Response, next) => {
  try {
    const modeId = req.params.modeId as string;
    const mode = await modesService.getModeConfig(req.userId!, modeId);
    if (!mode) {
      res.status(404).json({ success: false, error: "Mode not found" });
      return;
    }
    res.json({ success: true, data: mode });
  } catch (err) {
    next(err);
  }
});

// PUT /api/modes/:modeId/settings — update user's mode settings
const settingsSchema = z.record(z.unknown());

router.put("/:modeId/settings", async (req: AuthRequest, res: Response, next) => {
  try {
    const modeId = req.params.modeId as string;
    const settings = settingsSchema.parse(req.body);
    await modesService.updateUserModeSettings(req.userId!, modeId, settings);
    const updated = await modesService.getModeConfig(req.userId!, modeId);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    if (err instanceof Error && err.message.includes("Unknown mode")) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

// PUT /api/modes/default — set default mode
const defaultModeSchema = z.object({ modeId: z.string() });

router.put("/default", async (req: AuthRequest, res: Response, next) => {
  try {
    const body = defaultModeSchema.parse(req.body);
    await modesService.setUserDefaultMode(req.userId!, body.modeId);
    res.json({ success: true, data: { defaultMode: body.modeId } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    if (err instanceof Error && err.message.includes("Unknown mode")) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
