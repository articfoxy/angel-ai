import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import {
  listAllModes,
  getModeConfig,
  getUserModeSettings,
  updateUserModeSettings,
  setUserDefaultMode,
  getUserDefaultMode,
} from "../services/modes.service.js";

const router = Router();
router.use(authenticate);

// GET /api/modes - list all available modes with user settings
router.get("/", async (req: AuthRequest, res: Response, next) => {
  try {
    const modes = listAllModes();
    const defaultMode = await getUserDefaultMode(req.userId!);

    const modesWithSettings = await Promise.all(
      modes.map(async (mode) => {
        const userSettings = await getUserModeSettings(req.userId!, mode.modeId);
        return {
          ...mode,
          userSettings,
          isDefault: mode.modeId === defaultMode,
        };
      })
    );

    res.json({ success: true, data: modesWithSettings });
  } catch (err) {
    next(err);
  }
});

// GET /api/modes/:modeId - get specific mode config
router.get("/:modeId", async (req: AuthRequest, res: Response, next) => {
  try {
    const modeId = String(req.params.modeId);
    const userSettings = await getUserModeSettings(req.userId!, modeId);
    const config = getModeConfig(modeId, userSettings);
    const defaultMode = await getUserDefaultMode(req.userId!);

    res.json({
      success: true,
      data: {
        ...config,
        userSettings,
        isDefault: modeId === defaultMode,
      },
    });
  } catch (err) {
    next(err);
  }
});

const settingsSchema = z.object({
  maxWhispersPerMinute: z.number().optional(),
  whisperTypes: z.array(z.string()).optional(),
}).passthrough();

// PUT /api/modes/:modeId/settings - update user's mode settings
router.put("/:modeId/settings", async (req: AuthRequest, res: Response, next) => {
  try {
    const modeId = String(req.params.modeId);
    const settings = settingsSchema.parse(req.body);
    await updateUserModeSettings(req.userId!, modeId, settings);
    const updated = await getUserModeSettings(req.userId!, modeId);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    if (err instanceof Error && err.message.startsWith("Invalid mode")) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

const defaultModeSchema = z.object({
  modeId: z.string(),
});

// PUT /api/modes/default - set default mode
router.put("/default", async (req: AuthRequest, res: Response, next) => {
  try {
    const { modeId } = defaultModeSchema.parse(req.body);
    await setUserDefaultMode(req.userId!, modeId);
    res.json({ success: true, data: { defaultMode: modeId } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    if (err instanceof Error && err.message.startsWith("Invalid mode")) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
