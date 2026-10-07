import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canAccessQuiz } from "@/lib/quiz-access";

const schema = z.object({
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])),
  durationSec: z.number().int().min(0).max(86400).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour faire ce test." }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Réponses invalides." }, { status: 400 });

  const quiz = await prisma.quiz.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, academicLevelId: true, programId: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz introuvable." }, { status: 404 });
  if (!canAccessQuiz(user, quiz)) return NextResponse.json({ error: "Ce test ne correspond pas à ton profil." }, { status: 403 });

  let score = 0;
  const corrections = quiz.questions.map((q) => {
    const answer = parsed.data.answers[q.id] ?? null;
    const correct = answer === q.correctOption;
    if (correct) score++;
    return { id: q.id, selected: answer, correctOption: q.correctOption, explanation: q.explanation };
  });

  const cleanAnswers = parsed.data.answers;

  const settings = await prisma.platformSetting.findMany({
    where: {
      key: {
        in: [
          "GAMIFICATION_ENABLED",
          "POINTS_COMPLETED_TEST",
          "POINTS_CORRECT_ANSWER",
          "POINTS_PERFECT_TEST",
          "STREAK_BONUS",
        ],
      },
    },
    select: { key: true, value: true, enabled: true },
  });
  const settingMap = new Map(settings.map((item) => [item.key, item]));
  const gamificationEnabled =
    settingMap.get("GAMIFICATION_ENABLED")?.enabled !== false &&
    settingMap.get("GAMIFICATION_ENABLED")?.value !== "false";

  await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: quiz.id,
      score,
      total: quiz.questions.length,
      durationSec: parsed.data.durationSec ?? null,
      answers: cleanAnswers,
    },
  });

  let gamification = null;
  if (gamificationEnabled) {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const profile = await prisma.gamificationProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        points: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
      update: {},
    });

    const previousKey = profile.lastActivityDate
      ? profile.lastActivityDate.toISOString().slice(0, 10)
      : null;
    const previousDate = previousKey ? new Date(previousKey + "T00:00:00Z") : null;
    const todayDate = new Date(todayKey + "T00:00:00Z");
    const dayDifference = previousDate
      ? Math.round((todayDate.getTime() - previousDate.getTime()) / 86400000)
      : null;
    const currentStreak =
      dayDifference === 0 ? profile.currentStreak :
      dayDifference === 1 ? profile.currentStreak + 1 : 1;
    const bestStreak = Math.max(profile.bestStreak, currentStreak);

    const pointsCompleted = Number(settingMap.get("POINTS_COMPLETED_TEST")?.value ?? 10);
    const pointsCorrect = Number(settingMap.get("POINTS_CORRECT_ANSWER")?.value ?? 2);
    const pointsPerfect = Number(settingMap.get("POINTS_PERFECT_TEST")?.value ?? 20);
    const streakBonus = Number(settingMap.get("STREAK_BONUS")?.value ?? 5);
    const isPerfect = score === quiz.questions.length && quiz.questions.length > 0;
    const activityBonus = dayDifference === 0 ? 0 : Math.max(0, currentStreak - 1) * streakBonus;
    const gainedPoints =
      pointsCompleted +
      score * pointsCorrect +
      (isPerfect ? pointsPerfect : 0) +
      activityBonus;

    const updatedProfile = await prisma.gamificationProfile.update({
      where: { userId: user.id },
      data: {
        points: { increment: gainedPoints },
        currentStreak,
        bestStreak,
        lastActivityDate: todayDate,
      },
    });

    const [completedTests, attemptScores] = await Promise.all([
      prisma.quizAttempt.count({ where: { userId: user.id } }),
      prisma.quizAttempt.findMany({ where: { userId: user.id }, select: { score: true, total: true } }),
    ]);

    const perfectTests = attemptScores.filter((attempt) => attempt.total > 0 && attempt.score === attempt.total).length;

    const badges = await prisma.badge.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, requirementType: true, requirementValue: true },
    });
    const earned = await prisma.userBadge.findMany({
      where: { userId: user.id },
      select: { badgeId: true },
    });
    const earnedIds = new Set(earned.map((item) => item.badgeId));
    const newlyEarned = badges.filter((badge) => {
      if (earnedIds.has(badge.id)) return false;
      if (badge.requirementType === "TESTS_COMPLETED") return completedTests >= badge.requirementValue;
      if (badge.requirementType === "POINTS") return updatedProfile.points >= badge.requirementValue;
      if (badge.requirementType === "PERFECT_TESTS") return perfectTests >= badge.requirementValue;
      if (badge.requirementType === "BEST_STREAK") return updatedProfile.bestStreak >= badge.requirementValue;
      return false;
    });

    if (newlyEarned.length) {
      await prisma.userBadge.createMany({
        data: newlyEarned.map((badge) => ({
          id: crypto.randomUUID(),
          userId: user.id,
          badgeId: badge.id,
        })),
        skipDuplicates: true,
      });
    }

    gamification = {
      pointsGained: gainedPoints,
      totalPoints: updatedProfile.points,
      currentStreak: updatedProfile.currentStreak,
      newBadges: newlyEarned.map((badge) => ({ code: badge.code, name: badge.name })),
    };
  }

  return NextResponse.json({ score, total: quiz.questions.length, corrections, gamification });
}
