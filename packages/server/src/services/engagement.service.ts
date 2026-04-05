import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";

/**
 * Record session activity and update the user's streak.
 */
export async function recordSessionActivity(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.streak.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
      totalSessions: 1,
    },
    update: {
      totalSessions: { increment: 1 },
    },
  });

  // Calculate streak logic
  if (streak.lastActiveDate) {
    const lastActive = new Date(streak.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (diffDays === 1) {
      // Consecutive day — increment streak
      const newStreak = streak.currentStreak + 1;
      await prisma.streak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          lastActiveDate: today,
        },
      });
    } else if (diffDays > 1) {
      // Streak broken — reset to 1
      await prisma.streak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActiveDate: today,
        },
      });
    }
    // diffDays === 0: same day, no streak change needed (totalSessions already incremented)
  } else {
    // First activity ever — already set to 1 in the upsert create
    await prisma.streak.update({
      where: { userId },
      data: { lastActiveDate: today },
    });
  }
}

/**
 * Get streak data for a user.
 */
export async function getStreak(userId: string) {
  const streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalSessions: 0,
      totalSaves: 0,
    };
  }

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActiveDate: streak.lastActiveDate,
    totalSessions: streak.totalSessions,
    totalSaves: streak.totalSaves,
  };
}

/**
 * Record an "Angel Save" — when a whisper card was marked helpful.
 */
export async function recordSave(
  userId: string,
  _sessionId: string,
  _description: string,
): Promise<void> {
  await prisma.streak.upsert({
    where: { userId },
    create: { userId, totalSaves: 1 },
    update: { totalSaves: { increment: 1 } },
  });
}

/**
 * Get daily digest data for a user.
 */
export async function getDailyDigestData(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [streak, todaySessions, pendingCommitments, recentMemories] =
    await Promise.all([
      getStreak(userId),
      prisma.session.count({
        where: {
          userId,
          startedAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.memory.count({
        where: { userId, type: "commitment" },
      }),
      prisma.memory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    streak,
    todaySessions,
    pendingCommitments,
    recentIdeas: recentMemories
      .filter((m) => m.type === "concept")
      .map((m) => m.title),
    recentNudges: [],
  };
}

/**
 * Generate a daily digest text using GPT-4o-mini.
 */
export async function generateDailyDigest(userId: string): Promise<string> {
  const digestData = await getDailyDigestData(userId);
  const apiKey = config.ai.openaiApiKey;

  if (!apiKey) {
    return `Daily Digest: ${digestData.todaySessions} sessions today. Streak: ${digestData.streak.currentStreak} days. ${digestData.pendingCommitments} pending commitments.`;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Angel AI generating a friendly, concise daily digest. Keep it brief and actionable.",
          },
          {
            role: "user",
            content: `Generate a daily digest from this data:\n${JSON.stringify(digestData, null, 2)}`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("Digest generation error:", response.statusText);
      return `Daily Digest: ${digestData.todaySessions} sessions today. Streak: ${digestData.streak.currentStreak} days.`;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  } catch (err) {
    console.error("Digest generation failed:", err);
    return `Daily Digest: ${digestData.todaySessions} sessions today. Streak: ${digestData.streak.currentStreak} days.`;
  }
}
