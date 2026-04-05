import { config } from "../config/index.js";
import { prisma } from "../lib/prisma.js";

export async function recordSessionActivity(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.streak.findUnique({
    where: { userId },
  });

  if (!streak) {
    await prisma.streak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
        totalSessions: 1,
      },
    });
    return;
  }

  const lastActive = streak.lastActiveDate;
  const lastActiveDay = lastActive ? new Date(lastActive) : null;
  if (lastActiveDay) {
    lastActiveDay.setHours(0, 0, 0, 0);
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = streak.currentStreak;

  if (lastActiveDay) {
    const lastTime = lastActiveDay.getTime();
    if (lastTime === today.getTime()) {
      // Same day, just bump sessions
      newStreak = streak.currentStreak;
    } else if (lastTime === yesterday.getTime()) {
      // Consecutive day
      newStreak = streak.currentStreak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(streak.longestStreak, newStreak);

  await prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      totalSessions: streak.totalSessions + 1,
    },
  });
}

export async function getStreak(userId: string) {
  const streak = await prisma.streak.findUnique({
    where: { userId },
  });

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

export async function recordSave(userId: string, _sessionId: string, _description: string): Promise<void> {
  await prisma.streak.upsert({
    where: { userId },
    create: {
      userId,
      totalSaves: 1,
    },
    update: {
      totalSaves: { increment: 1 },
    },
  });
}

export async function getDailyDigestData(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [streak, sessions, pendingActions, memories] = await Promise.all([
    getStreak(userId),
    prisma.session.count({
      where: {
        userId,
        startedAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.action.count({
      where: {
        userId,
        status: "draft",
      },
    }),
    prisma.memory.count({
      where: { userId },
    }),
  ]);

  return {
    streak,
    todaySessions: sessions,
    pendingActions,
    totalMemories: memories,
  };
}

export async function generateDailyDigest(userId: string): Promise<string> {
  const data = await getDailyDigestData(userId);

  if (!config.ai.openaiApiKey) {
    return `Daily Digest:
- Streak: ${data.streak.currentStreak} days
- Sessions today: ${data.todaySessions}
- Pending actions: ${data.pendingActions}
- Total memories: ${data.totalMemories}
Keep up the great work!`;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: config.ai.openaiApiKey });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are Angel AI generating a brief, encouraging daily digest. Be concise and warm.",
        },
        {
          role: "user",
          content: `Generate a daily digest based on this data: ${JSON.stringify(data)}`,
        },
      ],
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || "No digest available.";
  } catch (err) {
    console.error("[Engagement] Failed to generate digest:", err);
    return `Daily Digest: ${data.streak.currentStreak} day streak, ${data.todaySessions} sessions today.`;
  }
}
