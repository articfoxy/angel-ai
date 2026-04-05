import { getProvider } from "./ai-provider.js";
import { prisma } from "../lib/prisma.js";

const TYPE_PROMPTS: Record<string, string> = {
  email_draft:
    "Generate a professional email draft based on the following input.",
  memo: "Generate a structured memo based on the following input.",
  task: "Generate a task breakdown with clear action items from the following input.",
  reminder: "Generate a reminder note from the following input.",
  prd: "Generate a product requirements document based on the following input.",
  summary:
    "Generate a concise summary of the following content.",
};

export async function generateAction(
  userId: string,
  input: string,
  type: string,
  sessionId?: string
) {
  const provider = getProvider();

  let context: string | undefined;
  if (sessionId) {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (session?.transcript) {
      const segments = session.transcript as Array<{
        speaker: string;
        text: string;
      }>;
      context = segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");
    }
  }

  const prompt = `${TYPE_PROMPTS[type] || "Generate content based on the following input."}\n\nInput: ${input}`;
  const output = await provider.generate(prompt, context);

  return prisma.action.create({
    data: {
      userId,
      sessionId,
      type,
      input,
      output: { content: output, generatedAt: new Date().toISOString() },
    },
  });
}

export async function listActions(
  userId: string,
  status?: string,
  limit = 50,
  offset = 0
) {
  const where: any = { userId };
  if (status) where.status = status;

  return prisma.action.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function updateAction(
  id: string,
  userId: string,
  data: Partial<{ status: string; output: any }>
) {
  return prisma.action.update({
    where: { id, userId },
    data,
  });
}

export async function executeAction(id: string, userId: string) {
  const action = await prisma.action.findFirst({
    where: { id, userId },
  });

  if (!action) throw new Error("Action not found");
  if (action.status !== "approved") {
    throw new Error("Action must be approved before execution");
  }

  return prisma.action.update({
    where: { id, userId },
    data: { status: "executed" },
  });
}
