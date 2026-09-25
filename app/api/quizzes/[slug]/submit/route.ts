import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])),
});

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Réponses invalides." }, { status: 400 });

  const quiz = await prisma.quiz.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz introuvable." }, { status: 404 });

  let score = 0;
  const corrections = quiz.questions.map((q) => {
    const answer = parsed.data.answers[q.id] ?? null;
    const correct = answer === q.correctOption;
    if (correct) score++;
    return { id: q.id, selected: answer, correctOption: q.correctOption, explanation: q.explanation };
  });

  return NextResponse.json({ score, total: quiz.questions.length, corrections });
}
