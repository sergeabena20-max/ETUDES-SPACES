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
