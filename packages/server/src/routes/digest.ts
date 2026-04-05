import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { getOrGenerateDigest } from "../services/digest.js";

const router = Router();
router.use(authenticate);

router.get("/today", async (req: AuthRequest, res: Response, next) => {
  try {
    const digest = await getOrGenerateDigest(req.userId!, new Date());
    res.json({ success: true, data: digest });
  } catch (err) {
    next(err);
  }
});

router.get("/:date", async (req: AuthRequest, res: Response, next) => {
  try {
    const dateStr = req.params.date as string;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      res
        .status(400)
        .json({ success: false, error: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }
    const digest = await getOrGenerateDigest(req.userId!, date);
    res.json({ success: true, data: digest });
  } catch (err) {
    next(err);
  }
});

export default router;
