import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
  const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

router.post("/register", async (req, res: Response, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
      },
    });

    const tokens = generateTokens(user.id);
    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        ...tokens,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

router.post("/login", async (req, res: Response, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const tokens = generateTokens(user.id);
    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        ...tokens,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    next(err);
  }
});

router.post("/refresh", async (req, res: Response, next) => {
  try {
    const body = refreshSchema.parse(req.body);

    const payload = jwt.verify(body.refreshToken, config.jwt.refreshSecret) as {
      userId: string;
    };

    const tokens = generateTokens(payload.userId);
    res.json({ success: true, data: tokens });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors });
      return;
    }
    res.status(401).json({ success: false, error: "Invalid refresh token" });
  }
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
