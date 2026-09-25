import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canAccessQuiz } from "@/lib/quiz-access";

const schema = z.object({
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])),
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

  return NextResponse.json({ score, total: quiz.questions.length, corrections });
}
