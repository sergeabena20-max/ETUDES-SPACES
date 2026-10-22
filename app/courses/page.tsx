import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatAcademicLevelName } from "@/lib/academic-level-label";

export const revalidate = 60;

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      isPremium: true,
      subject: { select: { name: true } },
      academicLevel: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  return (
    <main className="min-h-screen bg-[#f8f7ff]">
      <header className="site-header sticky top-0 z-30">
        <div className="container flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4c1d95] font-black text-white">E</span>
            <span className="font-extrabold tracking-tight">Etudes <span className="text-[#4c1d95]">Space</span></span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600 sm:gap-6">
            <Link href="/exams" className="hover:text-orange-700">Épreuves</Link>
            <Link href="/dashboard" className="rounded-lg bg-[#4c1d95] px-4 py-2.5 font-bold text-white hover:bg-[#5b21b6]">Mon espace</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="container py-10 sm:py-14">
          <p className="eyebrow">Bibliothèque pédagogique</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#202c38] sm:text-4xl">Cours et ressources</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Retrouve les notions essentielles, classées par matière et niveau, pour réviser avec méthode.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-orange-50 px-3 py-2 font-semibold text-orange-800">Cours publiés</span>
            <Link href="/exams" className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-700">Consulter les épreuves →</Link>
          </div>
        </div>
      </section>

      <section className="container py-8 sm:py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div><h2 className="text-xl font-bold tracking-tight text-[#202c38]">Catalogue des cours</h2><p className="mt-1 text-sm text-slate-500">{courses.length} ressource{courses.length > 1 ? "s" : ""} affichée{courses.length > 1 ? "s" : ""}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.length ? courses.map((course) => (
            <article key={course.id} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-sm font-extrabold text-orange-700">CO</span>
                {course.isPremium && <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">Premium</span>}
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-orange-700">{course.subject?.name || "Matière"} <span className="px-1 text-slate-300">/</span> {formatAcademicLevelName(course.academicLevel?.name) || "Tous niveaux"}</p>
              <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight text-[#202c38] group-hover:text-orange-700">{course.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{course.description || "Ressource pédagogique disponible."}</p>
              <Link href={course.slug ? `/courses/${course.slug}` : "/courses"} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-orange-700">Consulter le cours <span aria-hidden="true">→</span></Link>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:col-span-2 lg:col-span-3">
              <h2 className="font-bold text-[#202c38]">Les premiers cours arrivent bientôt.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Le catalogue sera alimenté depuis l’administration. Reviens bientôt pour découvrir les nouvelles ressources.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
