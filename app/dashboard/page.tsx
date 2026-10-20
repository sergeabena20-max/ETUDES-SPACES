import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { formatAcademicLevelName } from "@/lib/academic-level-label";
import { prisma } from "@/lib/prisma";
import { canAccessQuiz } from "@/lib/quiz-access";
import { getGamificationLevel } from "@/lib/gamification";

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
  if (user.mustChangePassword) redirect("/change-password");

  const pendingAdminIssues = user.type === "ADMIN" || user.type === "SUPER_ADMIN"
    ? (await prisma.auditLog.findMany({
        where: { action: "USER_ISSUE_REPORTED", entity: "SUPPORT_REPORT" },
        select: { metadata: true },
        take: 100,
      })).filter((row) => ((row.metadata ?? {}) as unknown as { status?: string }).status !== "RESOLVED").length
    : 0;

  // Recommend only published content matching the learner's class or university program.
  const learnerContentFilter = user.academicLevel?.id || user.program?.id
    ? {
        status: "PUBLISHED" as const,
        OR: [
          ...(user.academicLevel?.id ? [{ academicLevelId: user.academicLevel.id }] : []),
          ...(user.program?.id ? [{ programId: user.program.id }] : []),
        ],
      }
    : null;
  const [recommendedExams, recommendedCourses] = learnerContentFilter
    ? await Promise.all([
        prisma.exam.findMany({
          where: learnerContentFilter,
          select: { id: true, title: true, slug: true, year: true, category: true, isPremium: true, subject: { select: { name: true } } },
          orderBy: [{ year: "desc" }, { createdAt: "desc" }],
          take: 4,
        }),
        prisma.course.findMany({
          where: learnerContentFilter,
          select: { id: true, title: true, slug: true, isPremium: true, subject: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 4,
        }),
      ])
    : [[], []];

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
  const gamificationLevel = gamificationProfile ? await getGamificationLevel(gamificationProfile.points) : null;

  return (
    <main className="min-h-screen bg-[#faf8f3] pb-10">
      <header className="site-header sticky top-0 z-30">
        <div className="container flex items-center justify-between py-4">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="shrink-0 font-black">Etudes <span className="gradient-text">Space</span> 🇨🇲</Link>
            <nav aria-label="Navigation principale" className="hidden items-center gap-3 text-sm font-bold text-slate-600 lg:flex">
              <Link href="/courses" className="rounded-lg px-2 py-2 hover:bg-white hover:text-[#b65a3c]">Cours</Link>
              <Link href="/exams" className="rounded-lg px-2 py-2 hover:bg-white hover:text-[#b65a3c]">Épreuves</Link>
              <Link href="/quizzes" className="rounded-lg px-2 py-2 hover:bg-white hover:text-[#b65a3c]">Entraînement</Link>
              <Link href="/favorites" className="rounded-lg px-2 py-2 hover:bg-white hover:text-[#b65a3c]">Favoris</Link>
              <Link href="/profile" className="rounded-lg px-2 py-2 hover:bg-white hover:text-[#b65a3c]">Profil</Link>
              {(user.type === "ADMIN" || user.type === "SUPER_ADMIN") && <Link href="/admin" className="rounded-lg bg-[#193b35] px-3 py-2 text-white hover:bg-[#28554b]">Administration</Link>}
            </nav>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:border-orange-200 hover:bg-orange-50">
              Déconnexion
            </button>
          </form>
        </div>
        <nav aria-label="Navigation mobile" className="container flex gap-2 overflow-x-auto pb-3 text-xs font-bold text-slate-600 lg:hidden">
          <Link href="/courses" className="shrink-0 rounded-full border border-[#e9e5dc] bg-white px-3 py-2">Cours</Link>
          <Link href="/exams" className="shrink-0 rounded-full border border-[#e9e5dc] bg-white px-3 py-2">Épreuves</Link>
          <Link href="/quizzes" className="shrink-0 rounded-full border border-[#e9e5dc] bg-white px-3 py-2">Entraînement</Link>
          <Link href="/favorites" className="shrink-0 rounded-full border border-[#e9e5dc] bg-white px-3 py-2">Favoris</Link>
          <Link href="/profile" className="shrink-0 rounded-full border border-[#e9e5dc] bg-white px-3 py-2">Profil</Link>
          {(user.type === "ADMIN" || user.type === "SUPER_ADMIN") && <Link href="/admin" className="shrink-0 rounded-full bg-[#193b35] px-3 py-2 text-white">Administration</Link>}
        </nav>
      </header>

      {pendingAdminIssues > 0 && (user.type === "ADMIN" || user.type === "SUPER_ADMIN") && <section className="container pt-6"><Link href="/admin/issues" className="flex items-center justify-between gap-4 rounded-2xl border border-[#e9c6a7] bg-[#fff0e7] p-4 text-[#8d462b] transition hover:bg-[#ffe8da] sm:p-5"><span><span className="block font-extrabold">{pendingAdminIssues} signalement(s) à traiter</span><span className="mt-1 block text-sm">Des utilisateurs ont signalé un problème sur la plateforme.</span></span><span className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-bold">Consulter →</span></Link></section>}

      <section className="container relative z-10 py-7 sm:py-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="eyebrow">Ton espace d’apprentissage</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#202c38] sm:text-4xl">
            Bonjour {user.firstName} <span className="inline-block origin-bottom animate-bob">👋🏾</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Prêt à progresser aujourd’hui ? Retrouve tes cours, entraîne-toi et suis tes résultats au même endroit.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/exams" className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">Explorer les épreuves <span aria-hidden="true">→</span></Link>
            <Link href="/courses" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">Découvrir les cours</Link>
          </div>
        </div>

        {(recommendedExams.length > 0 || recommendedCourses.length > 0) && (
          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-600">Sélection personnalisée</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Pour ta classe ou ta filière</h2>
                <p className="mt-1 text-sm text-slate-500">Des contenus publiés correspondant à ton profil académique.</p>
              </div>
              <Link href="/exams" className="text-sm font-bold text-emerald-600">Toute la bibliothèque →</Link>
            </div>
            {recommendedExams.length > 0 && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-black">📝 Épreuves récentes</h3><Link href="/exams" className="text-sm font-bold text-emerald-600">Tout voir</Link></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {recommendedExams.map((exam) => (
                    <Link key={exam.id} href={`/exams/${exam.slug}`} className="card group p-5 transition hover:-translate-y-0.5">
                      <p className="text-xs font-bold text-emerald-600">{exam.subject?.name ?? "Matière"}{exam.year ? ` · ${exam.year}` : ""}</p>
                      <h4 className="mt-2 font-bold">{exam.title}</h4>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {exam.category && <span className="rounded-full bg-slate-100 px-2 py-1">{exam.category.replaceAll("_", " ")}</span>}
                        {exam.isPremium && <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700">Premium</span>}
                      </div>
                      <p className="mt-3 text-sm font-bold text-emerald-600">Consulter →</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {recommendedCourses.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-black">📚 Cours à découvrir</h3><Link href="/courses" className="text-sm font-bold text-emerald-600">Tous les cours</Link></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {recommendedCourses.map((course) => (
                    <Link key={course.id} href={`/courses/${course.slug}`} className="card p-4 transition hover:-translate-y-0.5">
                      <p className="text-xs font-bold text-emerald-600">{course.subject?.name ?? "Matière"}</p>
                      <h4 className="mt-2 font-bold">{course.title}</h4>
                      {course.isPremium && <span className="mt-3 inline-block rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Premium</span>}
                      <p className="mt-3 text-sm font-bold text-emerald-600">Découvrir →</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {myQuizzes.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-600">Pour toi</p>
                <h2 className="mt-1 text-2xl font-black">
                  Petits tests adaptés à ton profil
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Classe ou niveau :{" "}
                  {formatAcademicLevelName(user.academicLevel?.name) || "non renseigné"}
                  {user.program?.name ? ` · ${user.program.name}` : ""}
                </p>
              </div>

              <Link
                href="/quizzes"
                className="text-sm font-bold text-emerald-600"
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
                  <span className="mt-4 inline-block text-sm font-bold text-emerald-600">
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
                <p className="text-sm font-semibold text-emerald-600">Ma progression</p>
                <h2 className="mt-1 text-2xl font-black">Mes récompenses</h2>
              </div>
              <span className="text-sm font-bold text-slate-500">{gamificationProfile.points} points</span>
            </div>
            <div className="card mt-5 overflow-hidden p-5">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-sm text-slate-500">Niveau actuel</p><p className="mt-1 text-xl font-black">{gamificationLevel?.current.icon} {gamificationLevel?.current.name}</p><p className="mt-1 text-xs text-slate-500">{gamificationLevel?.current.description}</p></div>
                <div className="text-right"><p className="text-sm font-bold">{gamificationProfile.points} points</p>{gamificationLevel?.next && <p className="mt-1 text-xs text-slate-500">{gamificationLevel.pointsToNext} points avant {gamificationLevel.next.name}</p>}</div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${gamificationLevel?.progress ?? 0}%` }} /></div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="card p-5"><p className="text-sm text-slate-500">Points</p><p className="mt-2 text-3xl font-black">{gamificationProfile.points}</p></div>
              <div className="card p-5"><p className="text-sm text-slate-500">Série actuelle</p><p className="mt-2 text-3xl font-black">{gamificationProfile.currentStreak} jour{gamificationProfile.currentStreak > 1 ? "s" : ""}</p></div>
              <div className="card p-5"><p className="text-sm text-slate-500">Meilleure série</p><p className="mt-2 text-3xl font-black">{gamificationProfile.bestStreak} jour{gamificationProfile.bestStreak > 1 ? "s" : ""}</p></div>
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
              <p className="text-sm font-semibold text-emerald-600">Ma progression</p>
              <h2 className="mt-1 text-2xl font-black">Mes statistiques</h2>
            </div>
            <Link href="/quizzes/history" className="text-sm font-bold text-emerald-600">
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
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">{percentage}%</span>
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
            <Link href="/admin" className="card border-emerald-200 bg-emerald-50 p-6 transition hover:-translate-y-1">
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
