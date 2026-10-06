import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function QuizHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/quizzes/history");

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    orderBy: { completedAt: "desc" },
    take: 100,
    select: {
      id: true,
      score: true,
      total: true,
      durationSec: true,
      completedAt: true,
      quiz: { select: { title: true, slug: true, subject: { select: { name: true } } } },
    },
  });

  const average = attempts.length
    ? Math.round(
        (attempts.reduce((sum, item) => sum + (item.total ? (item.score / item.total) * 100 : 0), 0) / attempts.length) * 10,
      ) / 10
    : 0;

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <Link href="/dashboard" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
          <Link href="/quizzes" className="text-sm font-bold text-sky-600">Tous les tests →</Link>
        </div>
      </header>
      <section className="container max-w-5xl py-10">
        <p className="text-sm font-semibold text-sky-600">🧠 Mon entraînement</p>
        <h1 className="mt-2 text-4xl font-black">Historique des tests</h1>
        <p className="mt-2 text-slate-500">Retrouve tes tentatives, tes scores et ton temps de réalisation.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="card p-5"><p className="text-sm text-slate-500">Tentatives</p><p className="mt-2 text-3xl font-black">{attempts.length}</p></div>
          <div className="card p-5"><p className="text-sm text-slate-500">Score moyen</p><p className="mt-2 text-3xl font-black">{average}%</p></div>
          <div className="card p-5"><p className="text-sm text-slate-500">Meilleur score</p><p className="mt-2 text-3xl font-black">{attempts.length ? Math.max(...attempts.map((item) => item.total ? Math.round((item.score / item.total) * 100) : 0)) + "%" : "—"}</p></div>
        </div>

        <div className="mt-8 space-y-3">
          {attempts.length ? attempts.map((attempt) => {
            const percentage = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
            const duration = attempt.durationSec == null ? "Durée inconnue" : Math.floor(attempt.durationSec / 60) + " min " + (attempt.durationSec % 60) + " s";
            return (
              <Link key={attempt.id} href={"/quizzes/" + attempt.quiz.slug} className="card flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{attempt.quiz.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{attempt.quiz.subject?.name ?? "Matière"} · {new Date(attempt.completedAt).toLocaleDateString("fr-FR")} · {duration}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-black text-sky-700">{percentage}%</p>
                  <p className="text-xs text-slate-500">{attempt.score} / {attempt.total}</p>
                </div>
              </Link>
            );
          }) : (
            <div className="card p-8 text-center">
              <p className="text-3xl">📝</p>
              <h2 className="mt-3 font-bold">Aucune tentative pour le moment</h2>
              <p className="mt-1 text-sm text-slate-500">Commence un petit test pour construire ton historique.</p>
              <Link href="/quizzes" className="mt-5 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">Découvrir les tests</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
