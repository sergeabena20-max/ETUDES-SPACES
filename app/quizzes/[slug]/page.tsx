import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizPlayer from "./quiz-player";
import { getCurrentUser } from "@/lib/session";
import { canAccessQuiz } from "@/lib/quiz-access";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [user, quiz] = await Promise.all([
    getCurrentUser(),
    prisma.quiz.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        slug: true,
        academicLevelId: true,
        programId: true,
        description: true,
        subject: { select: { name: true } },
        academicLevel: { select: { id: true, name: true } },
        program: { select: { id: true, name: true } },
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            question: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            explanation: true,
          },
        },
      },
    }),
  ]);
  if (!quiz) notFound();
  if (!user) redirect("/login?next=" + encodeURIComponent("/quizzes/" + quiz.slug));
  if (!canAccessQuiz(user, quiz)) redirect("/quizzes?access=denied");

  const questions = quiz.questions.map(q => ({
    id: q.id, question: q.question,
    options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
    explanation: q.explanation,
  }));

  return <main className="relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl animate-float-slow" />
    <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl animate-float" />
    <div className="pointer-events-none absolute right-[12%] top-24 h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_28px_8px_rgba(56,189,248,.3)] animate-orbit-reverse" />
    <header className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
      <div className="container flex items-center justify-between py-4">
        <Link href="/quizzes" className="rounded-xl px-3 py-2 text-sm font-semibold text-sky-600 transition hover:bg-white hover:shadow-sm">← Tous les petits tests</Link>
        <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-sky-600 transition hover:bg-white hover:shadow-sm">Mon espace</Link>
      </div>
    </header>
    <section className="container relative z-10 max-w-4xl py-10">
      <div className="animate-slide-up">
        <div className="inline-flex rounded-full border border-sky-200 bg-white/75 px-3 py-1 text-sm font-bold text-sky-600 shadow-sm backdrop-blur">{quiz.subject?.name || "Matière"} · {quiz.academicLevel?.name || "Tous niveaux"}</div>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{quiz.title}</h1>
        <p className="mt-3 text-lg leading-8 text-slate-600">{quiz.description || "Petit test d'entraînement."}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">{quiz.program && <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200">{quiz.program.name}</span>}<span className="rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200">{questions.length} question{questions.length > 1 ? "s" : ""}</span></div>
      </div>
      <div className="card mt-8 animate-slide-up stagger-2 p-4 sm:p-6">
        <QuizPlayer questions={questions} slug={quiz.slug} />
      </div>
    </section>
  </main>;
}
