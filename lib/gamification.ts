import { prisma } from "@/lib/prisma";

export async function getGamificationLevel(points: number) {
  const levels = await prisma.gamificationLevel.findMany({
    where: { active: true },
    orderBy: { minPoints: "asc" },
    select: { id: true, name: true, minPoints: true, icon: true, description: true, order: true },
  });

  if (levels.length === 0) {
    return {
      current: { id: "default", name: "Débutant", minPoints: 0, icon: "🌱", description: "Tu commences ton parcours.", order: 1 },
      next: null,
      progress: 100,
      pointsToNext: 0,
    };
  }

  let current = levels[0];
  for (const level of levels) {
    if (level.minPoints <= points) current = level;
    else break;
  }

  const next = levels.find((level) => level.minPoints > points) ?? null;
  const progress = next
    ? Math.min(100, Math.max(0, Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)))
    : 100;

  return {
    current,
    next,
    progress,
    pointsToNext: next ? Math.max(0, next.minPoints - points) : 0,
  };
}
