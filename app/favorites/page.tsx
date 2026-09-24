import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Favorites() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");

  const fav = await prisma.favorite.findMany({
    where: { userId: u.id },
    include: { course: true, exam: true },
    orderBy: { createdAt: "desc" },
  });

  return <main className="min-h-screen">
    <header className="border-b bg-white">
      <div className="container flex items-center justify-between py-4">
        <Link href="/dashboard" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
        <Link href="/dashboard" className="text-sm text-sky-600">Mon espace</Link>
      </div>
    </header>
    <section className="container py-10">
      <p className="text-sm font-semibold text-sky-600">❤️ Mon espace</p>
      <h1 className="mt-2 text-4xl font-black">Mes favoris</h1>
      <p className="mt-2 text-slate-500">Retrouve rapidement les épreuves et contenus que tu veux garder sous la main.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {fav.length ? fav.map((f) => {
          const item = f.course ?? f.exam;
          const isExam = Boolean(f.exam);
          if (!item) return null;
          return <article key={f.id} className="card p-5">
            <div className="text-xs font-bold uppercase text-sky-600">{isExam ? "📝 Épreuve" : "📚 Cours"}</div>
            <h2 className="mt-2 text-lg font-bold">{item.title}</h2>
            <div className="mt-4">
              <Link
                href={isExam ? "/exams/" + item.slug : "/courses/" + item.slug}
                className="inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"
              >
                Ouvrir →
              </Link>
            </div>
          </article>;
        }) : <div className="card p-7 md:col-span-2">
          <p className="font-bold">Aucun favori pour le moment.</p>
          <p className="mt-2 text-sm text-slate-500">Ajoute tes épreuves importantes depuis leur page.</p>
          <Link href="/exams" className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">Voir les épreuves</Link>
        </div>}
      </div>
    </section>
  </main>;
}
