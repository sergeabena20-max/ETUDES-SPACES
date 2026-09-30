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

export async function canAccessPremiumContent(
  userId: string | null,
  isAdmin = false,
) {
  if (isAdmin) return true;
  if (!userId) return false;
  return hasPremiumAccess(userId);
}
