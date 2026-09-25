import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizPlayer from "./quiz-player";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = await prisma.quiz.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { subject: true, academicLevel: true, program: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) notFound();

  const questions = quiz.questions.map(q => ({
    id: q.id, question: q.question,
    options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
    explanation: q.explanation,
  }));

  return <main className="min-h-screen">
    <header className="border-b bg-white"><div className="container flex items-center justify-between py-4">
      <Link href="/quizzes" className="text-sm font-semibold text-sky-600">← Tous les petits tests</Link>
      <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
    </div></header>
    <section className="container max-w-4xl py-10">
      <div className="text-sm font-bold text-sky-600">{quiz.subject?.name || "Matière"} · {quiz.academicLevel?.name || "Tous niveaux"}</div>
      <h1 className="mt-2 text-4xl font-black">{quiz.title}</h1>
      <p className="mt-3 text-slate-600">{quiz.description || "Petit test d'entraînement."}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">{quiz.program && <span className="rounded-full bg-slate-100 px-3 py-1">{quiz.program.name}</span>}<span className="rounded-full bg-slate-100 px-3 py-1">{questions.length} question{questions.length > 1 ? "s" : ""}</span></div>
      <QuizPlayer questions={questions} />
    </section>
  </main>;
}
