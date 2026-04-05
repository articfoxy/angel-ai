import { prisma } from "../lib/prisma.js";
import { getProvider } from "./ai-provider.js";

export async function getOrGenerateDigest(userId: string, date: Date) {
  const dateOnly = new Date(date.toISOString().split("T")[0]);

  const existing = await prisma.digest.findUnique({
    where: { userId_date: { userId, date: dateOnly } },
  });

  if (existing) {
    if (!existing.opened) {
      await prisma.digest.update({
        where: { id: existing.id },
        data: { opened: true },
      });
    }
    return existing;
  }

  const dayStart = new Date(dateOnly);
  const dayEnd = new Date(dateOnly);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const sessions = await prisma.session.findMany({
    where: {
      userId,
      startedAt: { gte: dayStart, lt: dayEnd },
    },
    include: { actions: true },
  });

  const provider = getProvider();

  const sessionsText = sessions
    .map((s) => {
      const transcript = s.transcript as Array<{
        speaker: string;
        text: string;
      }> | null;
      const text = transcript
        ? transcript.map((t) => `${t.speaker}: ${t.text}`).join("\n")
        : "No transcript";
      return `Session: ${s.title || "Untitled"}\n${text}`;
    })
    .join("\n\n---\n\n");

  let digestContent: any;
  if (sessions.length === 0) {
    digestContent = {
      keyMoments: [],
      followUps: [],
      opportunities: [],
      ideas: [],
      sessionsCount: 0,
      actionsCount: 0,
    };
  } else {
    const generated = await provider.generate(
      `Compile a daily digest from these sessions. Return the key moments, follow-ups needed, opportunities identified, and ideas captured.`,
      sessionsText
    );

    digestContent = {
      keyMoments: [generated],
      followUps: sessions.flatMap(
        (s) => (s.actionItems as string[] | null) || []
      ),
      opportunities: sessions.flatMap(
        (s) => (s.risks as string[] | null) || []
      ),
      ideas: sessions.flatMap(
        (s) => (s.keyFacts as string[] | null) || []
      ),
      sessionsCount: sessions.length,
      actionsCount: sessions.reduce((c, s) => c + s.actions.length, 0),
      raw: generated,
    };
  }

  return prisma.digest.create({
    data: {
      userId,
      date: dateOnly,
      content: digestContent,
      opened: true,
    },
  });
}
