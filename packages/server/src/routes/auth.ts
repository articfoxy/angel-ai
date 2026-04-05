import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

// Apple JWKS client for verifying identity tokens
const appleJwks = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

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

    if (!user.passwordHash) {
      res.status(401).json({
        success: false,
        error: `This account uses ${user.provider} sign-in. Please use the ${user.provider} button.`,
      });
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

// --- Apple Sign In ---
const appleSchema = z.object({
  identityToken: z.string(),
  fullName: z
    .object({
      givenName: z.string().nullable().optional(),
      familyName: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

router.post("/apple", async (req, res: Response, next) => {
  try {
    const body = appleSchema.parse(req.body);

    // Decode header to get the key ID
    const decoded = jwt.decode(body.identityToken, { complete: true });
    if (!decoded || typeof decoded === "string") {
      res.status(401).json({ success: false, error: "Invalid Apple identity token" });
      return;
    }

    // Get Apple's public key
    const key = await appleJwks.getSigningKey(decoded.header.kid);
    const publicKey = key.getPublicKey();

    // Verify the token
    const payload = jwt.verify(body.identityToken, publicKey, {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
      audience: config.apple.bundleId,
    }) as { sub: string; email?: string; email_verified?: string };

    const appleUserId = payload.sub;
    const email = payload.email;

    if (!email) {
      res.status(400).json({ success: false, error: "Email not provided by Apple" });
      return;
    }

    // Build display name from Apple's fullName (only sent on first sign-in)
    const nameParts = [body.fullName?.givenName, body.fullName?.familyName].filter(Boolean);
    const displayName = nameParts.length > 0 ? nameParts.join(" ") : null;

    // Find existing user by provider ID or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { provider: "apple", providerUserId: appleUserId },
          { email },
        ],
      },
    });

    if (user) {
      // Link Apple provider if they signed up with email before
      if (user.provider === "email") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { provider: "apple", providerUserId: appleUserId },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: displayName,
          provider: "apple",
          providerUserId: appleUserId,
        },
      });
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
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: "Invalid Apple identity token" });
      return;
    }
    next(err);
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
