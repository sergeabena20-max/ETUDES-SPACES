import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function AdminAnalyticsPage() {
  const admin = await requireAdmin("analytics.read");
  if (!admin) redirect("/dashboard");

  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    students,
    pupils,
    totalCourses,
    publishedCourses,
    totalExams,
    publishedExams,
    totalFavorites,
    events7,
    events30,
    registrations7,
    registrations30,
    noResult7,
    topSearches,
    recentEvents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { studentStatus: "ETUDIANT" } }),
    prisma.user.count({ where: { studentStatus: "ELEVE" } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.exam.count(),
    prisma.exam.count({ where: { status: "PUBLISHED" } }),
    prisma.favorite.count(),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: since7 } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: since30 } } }),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.searchNoResult.count({ where: { createdAt: { gte: since7 } } }),
    prisma.analyticsEvent.groupBy({
      by: ["query"],
      where: { type: "SEARCH_PERFORMED", query: { not: null } },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { type: true, query: true, language: true, device: true, createdAt: true },
    }),
  ]);

  const cards = [
    ["Utilisateurs", totalUsers, "👥"],
    ["Actifs", activeUsers, "🟢"],
    ["Cours publiés", publishedCourses, "📚"],
    ["Épreuves publiées", publishedExams, "📝"],
    ["Favoris", totalFavorites, "⭐"],
    ["Événements · 7 j", events7, "📊"],
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link>
        <div className="mt-3">
          <p className="text-sm font-semibold text-sky-600">Analytics</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Vue d’ensemble</h1>
          <p className="mt-2 text-slate-500">Une lecture simple de l’utilisation actuelle de la plateforme.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map(([label, value, icon]) => (
            <div key={label as string} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{icon}</span>
                <span className="text-2xl font-black text-slate-900">{formatNumber(value as number)}</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="card p-6 lg:col-span-2">
            <h2 className="text-lg font-black text-slate-900">Utilisateurs</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-sky-50 p-5">
                <p className="text-sm text-sky-700">Élèves</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{formatNumber(pupils)}</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-5">
                <p className="text-sm text-indigo-700">Étudiants</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{formatNumber(students)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">Nouvelles inscriptions · 7 jours</p>
                <p className="mt-1 text-3xl font-black">{formatNumber(registrations7)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm text-slate-500">Nouvelles inscriptions · 30 jours</p>
                <p className="mt-1 text-3xl font-black">{formatNumber(registrations30)}</p>
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-black text-slate-900">Contenu</h2>
            <div className="mt-5 space-y-4">
              <div className="flex justify-between border-b pb-4"><span className="text-slate-500">Cours</span><strong>{formatNumber(totalCourses)}</strong></div>
              <div className="flex justify-between border-b pb-4"><span className="text-slate-500">Épreuves</span><strong>{formatNumber(totalExams)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Recherches sans résultat · 7 j</span><strong>{formatNumber(noResult7)}</strong></div>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="text-lg font-black text-slate-900">Recherches les plus fréquentes</h2>
            <div className="mt-4 space-y-3">
              {topSearches.length ? topSearches.map((item) => (
                <div key={item.query} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <span className="truncate pr-4 font-medium">{item.query}</span>
                  <span className="shrink-0 text-sm font-bold text-sky-600">{item._count.query}</span>
                </div>
              )) : <p className="text-sm text-slate-500">Aucune recherche enregistrée pour le moment.</p>}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-black text-slate-900">Activité récente</h2>
            <div className="mt-4 space-y-3">
              {recentEvents.length ? recentEvents.map((event, index) => (
                <div key={index} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">{event.type}</span>
                    <span className="text-xs text-slate-400">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(event.createdAt)}</span>
                  </div>
                  {event.query && <p className="mt-1 truncate text-xs text-slate-500">Recherche : {event.query}</p>}
                </div>
              )) : <p className="text-sm text-slate-500">Aucune activité enregistrée.</p>}
            </div>
          </section>
        </div>

        <div className="mt-6 text-sm text-slate-500">
          Activité : {formatNumber(events7)} événements sur 7 jours · {formatNumber(events30)} sur 30 jours.
        </div>
      </section>
    </main>
  );
}
