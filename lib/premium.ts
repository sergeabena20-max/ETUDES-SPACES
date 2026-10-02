import { prisma } from "@/lib/prisma";

export async function hasPremiumAccess(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "active",
      plan: { code: "PREMIUM", active: true },
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(subscription);
}

export async function hasExamAccess(userId: string, examId: string) {
  const [subscription, purchase] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        plan: { code: "PREMIUM", active: true },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { id: true },
    }),
    prisma.examPurchase.findUnique({
      where: { userId_examId: { userId, examId } },
      select: { id: true },
    }),
  ]);

  return Boolean(subscription || purchase);
}

export async function getExamAccessMap(userId: string, examIds: string[]) {
  const ids = [...new Set(examIds)];
  if (!ids.length) return new Map<string, boolean>();

  const [subscription, purchases] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        plan: { code: "PREMIUM", active: true },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { id: true },
    }),
    prisma.examPurchase.findMany({
      where: {
        userId,
        examId: { in: ids },
      },
      select: { examId: true },
    }),
  ]);

  const access = new Map<string, boolean>();
  if (subscription) {
    for (const id of ids) access.set(id, true);
    return access;
  }

  for (const purchase of purchases) {
    access.set(purchase.examId, true);
  }

  return access;
}
