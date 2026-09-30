import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasExamAccess } from "@/lib/premium";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; year?: string }> };

export default async function ExamsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim();
  const year = params.year ? Number(params.year) : undefined;

  const user = await getCurrentUser();

  const exams = await prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      ...(year && Number.isInteger(year) ? { year } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { subject: { name: { contains: q, mode: "insensitive" } } },
        { academicLevel: { name: { contains: q, mode: "insensitive" } } },
        { program: { name: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: { subject: true, academicLevel: true, solution: true },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  const years = await prisma.exam.findMany({
    where: { status: "PUBLISHED", year: { not: null } },
    select: { year: true },
    distinct: ["year"],
    orderBy: { year: "desc" },
    take: 30,
  });

  const accessByExam = new Map<string, boolean>();
  if (user) {
    const premiumChecks = await Promise.all(exams.filter((e) => e.isPremium).map(async (e) => [e.id, await hasExamAccess(user.id, e.id)] as const));
    premiumChecks.forEach(([id, access]) => accessByExam.set(id, access));
  }

  return <main className="min-h-screen">
    <header className="border-b bg-white"><div className="container flex items-center justify-between py-4">
      <Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
      <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
    </div></header>
    <section className="container py-10">
      <p className="text-sm font-semibold text-sky-600">📝 Entraînement</p>
      <h1 className="mt-2 text-4xl font-black">Épreuves & anciens sujets</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Retrouve les anciennes épreuves publiées, entraîne-toi et consulte les corrections lorsqu'elles sont disponibles.</p>
      <form className="mt-8 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[1fr_180px_auto]">
        <input name="q" defaultValue={q} placeholder="Matière, épreuve, série, niveau..." className="rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200" />
        <select name="year" defaultValue={year?.toString() || ""} className="rounded-xl border px-4 py-3">
          <option value="">Toutes les années</option>
          {years.map((y) => <option key={y.year} value={y.year!}>{y.year}</option>)}
        </select>
        <button className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Rechercher</button>
      </form>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exams.length ? exams.map((e) => { const access = !e.isPremium || accessByExam.get(e.id) === true; return <article key={e.id} className="card p-5">
          <div className="text-xs font-bold uppercase text-sky-600">{e.subject?.name || "Matière"} · {e.year || "—"}</div>
          <h2 className="mt-3 text-xl font-bold">{e.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{e.description || "Ancienne épreuve disponible."}</p>{e.isPremium && !access && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">🔒 Cette épreuve est réservée aux membres Premium. <Link href="/premium" className="underline">Activer Premium</Link></div>}
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">{e.isPremium && <span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">⭐ Premium</span>}<span className="rounded-full bg-slate-100 px-3 py-1">{e.academicLevel?.name || "Tous niveaux"}</span>{e.category && <span className="rounded-full bg-slate-100 px-3 py-1">{e.category}</span>}</div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={"/exams/" + e.slug} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">{e.isPremium && !access ? "Voir les conditions Premium" : "Voir l’épreuve"}</Link>
            {e.fileUrl && access && <a className="rounded-xl border px-4 py-2 text-sm font-bold" href={e.fileUrl} target="_blank" rel="noreferrer">Voir le PDF</a>}
            {e.fileUrl && access && <a className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700" href={"/api/exams/" + e.id + "/download"}>Télécharger le sujet ↓</a>}
            {e.solution?.fileUrl && access && <a className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700" href={"/api/exams/" + e.id + "/download?kind=solution"}>Télécharger la correction ↓</a>}
          </div>
        </article> }) : <div className="card p-8 md:col-span-3"><h2 className="font-bold">Les premières épreuves arrivent bientôt.</h2><p className="mt-2 text-sm text-slate-500">Les sujets seront ajoutés progressivement par l'administration.</p></div>}
      </div>
    </section>
  </main>;
}
