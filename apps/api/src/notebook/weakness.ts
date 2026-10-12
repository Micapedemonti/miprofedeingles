import { ErrorCategory, Prisma } from '@prisma/client';

/** Increment a weakness and keep its three most recent examples. Call inside a transaction. */
export async function recordWeakness(
  tx: Prisma.TransactionClient,
  userId: string,
  data: { category: ErrorCategory; wrong: string; correct: string; note?: string | null },
) {
  const existing = await tx.weakness.findUnique({
    where: { userId_category: { userId, category: data.category } },
  });
  const oldExamples = Array.isArray(existing?.examples) ? existing.examples : [];
  const examples = [
    { wrong: data.wrong, correct: data.correct, note: data.note ?? null, at: new Date().toISOString() },
    ...oldExamples,
  ].slice(0, 3);

  return tx.weakness.upsert({
    where: { userId_category: { userId, category: data.category } },
    create: { userId, category: data.category, count: 1, lastOccurredAt: new Date(), examples },
    update: { count: { increment: 1 }, lastOccurredAt: new Date(), examples },
  });
}
