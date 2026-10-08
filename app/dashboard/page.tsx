import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccessQuiz } from "@/lib/quiz-access";

export default async function Dashboard() {
  const [user, quizzes] = await Promise.all([
    getCurrentUser(),
    prisma.quiz.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        slug: true,
        academicLevelId: true,
        programId: true,
        subject: { select: { name: true } },
        academicLevel: { select: { id: true, name: true } },
        program: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const [attempts, favoriteCount, attemptStats, gamificationProfile, earnedBadges] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: {
        id: true,
        score: true,
        total: true,
        durationSec: true,
        completedAt: true,
        quiz: { select: { title: true, slug: true } },
      },
    }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.quizAttempt.aggregate({
      where: { userId: user.id },
      _sum: { score: true, total: true },
      _count: { _all: true },
    }),
    prisma.gamificationProfile.findUnique({
      where: { userId: user.id },
      select: { points: true, currentStreak: true, bestStreak: true },
    }),
    prisma.userBadge.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: "desc" },
      take: 5,
      select: {
        earnedAt: true,
        badge: { select: { name: true, icon: true, description: true } },
      },
    }),
  ]);

  const totalAttempts = attemptStats._count._all;
  const averageScore =
    attemptStats._sum.total && attemptStats._sum.total > 0
      ? Math.round(
          ((attemptStats._sum.score ?? 0) / attemptStats._sum.total) * 1000,
        ) / 10
      : 0;

  const myQuizzes = quizzes.filter((q) => canAccessQuiz(user, q)).slice(0, 3);

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="font-black">
            Études <span className="gradient-text">Space</span> 🇨🇲
          </Link>

          <form action="/api/auth/logout" method="post">
            <button className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <section className="container py-10">
        <p className="text-sm font-semibold text-sky-600">Mon espace</p>
        <h1 className="mt-2 text-4xl font-black">
          Bonjour {user.firstName} 👋🏾
        </h1>
        <p className="mt-2 text-slate-500">
          Que veux-tu apprendre aujourd'hui ?
        </p>

        {myQuizzes.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-600">Pour toi</p>
                <h2 className="mt-1 text-2xl font-black">
                  Petits tests adaptés à ton profil
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Classe ou niveau :{" "}
                  {user.academicLevel?.name ?? "non renseigné"}
                  {user.program?.name ? ` · ${user.program.name}` : ""}
                </p>
              </div>

              <Link
                href="/quizzes"
                className="text-sm font-bold text-sky-600"
              >
                Voir tous →
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {myQuizzes.map((q) => (
                <Link
                  key={q.id}
                  href={`/quizzes/${q.slug}`}
                  className="card p-5 transition hover:-translate-y-1"
                >
                  <span className="text-2xl">🧠</span>
                  <h3 className="mt-3 font-bold">{q.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {q._count.questions} questions ·{" "}
                    {q.subject?.name ?? "Matière"}
                  </p>
                  <span className="mt-4 inline-block text-sm font-bold text-sky-600">
                    Commencer →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {gamificationProfile && (
          <section className="mt-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-600">Ma progression</p>
                <h2 className="mt-1 text-2xl font-black">Mes récompenses</h2>
              </div>
              <span className="text-sm font-bold text-slate-500">{gamificationProfile.points} points</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="card p-5"><p className="text-sm text-slate-500">Points</p><p className="mt-2 text-3xl font-black">{gamification.points}</p></div>
              <div className="card p-5"><p className="text-sm text-slate-500">Série actuelle</p><p className="mt-2 text-3xl font-black">{gamificationProfile.currentStreak} jour{gamification.currentStreak > 1 ? "s" : ""}</p></div>
              <div className="card p-5"><p className="text-sm text-slate-500">Meilleure série</p><p className="mt-2 text-3xl font-black">{gamificationProfile.bestStreak} jour{gamification.bestStreak > 1 ? "s" : ""}</p></div>
            </div>
            {earnedBadges.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {earnedBadges.map((item) => (
                  <div key={item.earnedAt.toISOString()} className="card p-4">
                    <span className="text-2xl">{item.badge.icon}</span>
                    <p className="mt-2 font-bold">{item.badge.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.badge.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-600">Ma progression</p>
              <h2 className="mt-1 text-2xl font-black">Mes statistiques</h2>
            </div>
            <Link href="/quizzes/history" className="text-sm font-bold text-sky-600">
              Voir mon historique →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5"><p className="text-sm text-slate-500">Tests réalisés</p><p className="mt-2 text-3xl font-black">{totalAttempts}</p></div>
            <div className="card p-5"><p className="text-sm text-slate-500">Score moyen</p><p className="mt-2 text-3xl font-black">{averageScore}%</p></div>
            <div className="card p-5"><p className="text-sm text-slate-500">Favoris</p><p className="mt-2 text-3xl font-black">{favoriteCount}</p></div>
            <div className="card p-5"><p className="text-sm text-slate-500">Dernier test</p><p className="mt-2 text-lg font-black">{attempts[0] ? Math.round((attempts[0].score / attempts[0].total) * 100) + "%" : "—"}</p></div>
          </div>
        </section>

        {attempts.length > 0 && <section className="mt-10">
          <h2 className="text-2xl font-black">Dernières tentatives</h2>
          <div className="mt-4 grid gap-3">
            {attempts.map((attempt) => {
              const percentage = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;
              return <Link key={attempt.id} href={"/quizzes/" + attempt.quiz.slug} className="card flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5">
                <div><p className="font-bold">{attempt.quiz.title}</p><p className="mt-1 text-xs text-slate-500">{new Date(attempt.completedAt).toLocaleDateString("fr-FR")} · {attempt.durationSec ? Math.floor(attempt.durationSec / 60) + " min " + (attempt.durationSec % 60) + " s" : "durée inconnue"}</p></div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">{percentage}%</span>
              </Link>;
            })}
          </div>
        </section>}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/courses" className="card p-6 transition hover:-translate-y-1">
            <span className="text-3xl">📚</span>
            <h2 className="mt-4 font-bold">Cours</h2>
            <p className="mt-1 text-sm text-slate-500">Apprendre par matière.</p>
          </Link>

          <Link href="/exams" className="card p-6 transition hover:-translate-y-1">
            <span className="text-3xl">📝</span>
            <h2 className="mt-4 font-bold">Épreuves</h2>
            <p className="mt-1 text-sm text-slate-500">S'entraîner avec des sujets.</p>
          </Link>

          <Link href="/favorites" className="card p-6 transition hover:-translate-y-1">
            <span className="text-3xl">❤️</span>
            <h2 className="mt-4 font-bold">Mes favoris</h2>
            <p className="mt-1 text-sm text-slate-500">Retrouver mes contenus.</p>
          </Link>

          <Link href="/premium" className="card border-amber-200 bg-amber-50 p-6 transition hover:-translate-y-1">
            <span className="text-3xl">⭐</span>
            <h2 className="mt-4 font-bold">Premium</h2>
            <p className="mt-1 text-sm text-slate-500">Activer ou demander la validation.</p>
          </Link>

          <Link href="/profile" className="card p-6 transition hover:-translate-y-1">
            <span className="text-3xl">👤</span>
            <h2 className="mt-4 font-bold">Mon profil</h2>
            <p className="mt-1 text-sm text-slate-500">Mes informations.</p>
          </Link>

          {(user.type === "ADMIN" || user.type === "SUPER_ADMIN") && (
            <Link href="/admin" className="card border-sky-200 bg-sky-50 p-6 transition hover:-translate-y-1">
              <span className="text-3xl">⚙️</span>
              <h2 className="mt-4 font-bold">Administration</h2>
              <p className="mt-1 text-sm text-slate-500">Gérer la plateforme.</p>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
