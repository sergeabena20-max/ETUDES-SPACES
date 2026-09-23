import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdmin();
  if (!user) redirect("/login");

  const [users, courses, exams, searches] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.exam.count(),
    prisma.searchNoResult.count(),
  ]);

  const cards = [
    { label: "Utilisateurs", value: users, icon: "👥", href: "/admin/users" },
    { label: "Cours", value: courses, icon: "📚", href: "/admin/courses" },
    { label: "Épreuves", value: exams, icon: "📝", href: "/admin/exams" },
    { label: "Recherches sans résultat", value: searches, icon: "🔎", href: "/admin/searches" },
    { label: "Analytics", value: "→", icon: "📊", href: "/admin/analytics" },
  ];

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white/90">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:block">{user.firstName} {user.lastName}</span>
            <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
          </div>
        </div>
      </header>

      <section className="container py-10">
        <div>
          <p className="text-sm font-semibold text-sky-600">Administration</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Centre de contrôle</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Gérez les utilisateurs, les contenus et suivez l'activité de la plateforme.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <Link key={card.label} href={card.href} className="card p-6 transition hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{card.icon}</span>
                <span className="text-3xl font-black">{card.value}</span>
              </div>
              <h2 className="mt-4 font-bold">{card.label}</h2>
              <p className="mt-1 text-sm text-slate-500">Ouvrir →</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="card p-6">
            <h2 className="text-lg font-bold">Contenu</h2>
            <p className="mt-1 text-sm text-slate-500">Accès rapide aux espaces de publication.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/admin/courses" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">Gérer les cours</Link>
              <Link href="/admin/exams" className="rounded-xl border px-4 py-2 text-sm font-bold">Gérer les épreuves</Link>
            </div>
          </section>
          <section className="card p-6">
            <h2 className="text-lg font-bold">Plateforme</h2>
            <p className="mt-1 text-sm text-slate-500">Les rôles et permissions permettent une gestion avancée.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/admin/users" className="rounded-xl border px-4 py-2 text-sm font-bold">Utilisateurs</Link>
              <Link href="/admin/searches" className="rounded-xl border px-4 py-2 text-sm font-bold">Recherches sans résultat</Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
