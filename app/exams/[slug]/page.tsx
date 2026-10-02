import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasExamAccess } from "@/lib/premium";
import ExamActions from "./exam-actions";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [exam, user] = await Promise.all([
    prisma.exam.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        year: true,
        fileUrl: true,
        isPremium: true,
        subject: { select: { name: true } },
        academicLevel: { select: { name: true } },
        school: { select: { name: true } },
        program: { select: { name: true } },
        solution: { select: { text: true, fileUrl: true } },
      },
    }),
    getCurrentUser(),
  ]);
  if (!exam) notFound();

  const isAdmin = user?.type === "ADMIN" || user?.type === "SUPER_ADMIN";
  const premium = user && exam.isPremium && !isAdmin
    ? await hasExamAccess(user.id, exam.id)
    : false;
  const canViewPremium = !exam.isPremium || premium || isAdmin;

  const [existingFavorite, comments] = canViewPremium
    ? await Promise.all([
        user
          ? prisma.favorite.findFirst({
              where: { userId: user.id, examId: exam.id },
              select: { id: true },
            })
          : null,
        prisma.comment.findMany({
          where: { examId: exam.id },
          select: {
            id: true,
            userId: true,
            content: true,
            createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      ])
    : [null, []];

  const serializedComments = comments.map((comment) => ({
    id: comment.id,
    userId: comment.userId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
  }));

  return <main className="relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl animate-float-slow" />
    <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl animate-float" />
    <div className="pointer-events-none absolute right-[12%] top-24 h-3 w-3 rounded-full bg-sky-400 shadow-[0_0_28px_8px_rgba(56,189,248,.3)] animate-orbit" />
    <header className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl">
      <div className="container flex items-center justify-between py-4">
        <Link href="/exams" className="rounded-xl px-3 py-2 text-sm font-semibold text-sky-600 transition hover:bg-white hover:shadow-sm">← Toutes les épreuves</Link>
        <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-sky-600 transition hover:bg-white hover:shadow-sm">Mon espace</Link>
      </div>
    </header>
    <section className="container relative z-10 max-w-4xl py-10">
      <div className="animate-slide-up">
        <div className="inline-flex rounded-full border border-sky-200 bg-white/75 px-3 py-1 text-sm font-bold text-sky-600 shadow-sm backdrop-blur">{exam.subject?.name || "Matière"} · {exam.year || "Année non précisée"}</div>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{exam.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{exam.description || "Ancienne épreuve disponible pour entraînement."}</p>
        {exam.isPremium && !canViewPremium && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="font-black">🔒 Contenu Premium</p><p className="mt-1 text-sm">Cette épreuve et ses documents sont réservés aux membres Premium.</p><Link href={"/premium?exam=" + exam.id} className="mt-4 inline-block rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white">Activer Premium →</Link></div>}
        <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600">
          {exam.academicLevel && <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200">{exam.academicLevel.name}</span>}
          {exam.program && <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200">{exam.program.name}</span>}
          {exam.school && <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200">{exam.school.name}</span>}
        </div>
      </div>

      {canViewPremium && <div className="mt-8 animate-slide-up stagger-2">
        <ExamActions
          examId={exam.id}
          initialFavorite={Boolean(existingFavorite)}
          initialComments={serializedComments}
          isAuthenticated={Boolean(user)}
          currentUserId={user?.id ?? null}
        />
      </div>}

      {canViewPremium && <div className="card mt-8 animate-slide-up stagger-3 p-6">
        <h2 className="text-xl font-bold">Sujet</h2>
        {exam.fileUrl ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white shadow-lg shadow-sky-600/20">Voir le sujet PDF →</a>
            <a href={"/api/exams/" + exam.id + "/download"} className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 font-bold text-sky-700">Télécharger le sujet ↓</a>
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">Le document du sujet sera ajouté prochainement.</p>}
      </div>}

      {canViewPremium && <div className="card mt-5 animate-slide-up stagger-4 p-6">
        <h2 className="text-xl font-bold">Correction</h2>
        {exam.solution?.text ? <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{exam.solution.text}</div> : null}
        {exam.solution?.fileUrl ? <div className="mt-4 flex flex-wrap gap-3">
          <a href={exam.solution.fileUrl} target="_blank" rel="noreferrer" className="rounded-xl border px-5 py-3 font-bold">Voir la correction PDF →</a>
          <a href={"/api/exams/" + exam.id + "/download?kind=solution"} className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 font-bold text-sky-700">Télécharger la correction ↓</a>
        </div> : null}
        {!exam.solution?.text && !exam.solution?.fileUrl && <p className="mt-3 text-sm text-slate-500">La correction de cette épreuve n'est pas encore disponible.</p>}
      </div>}
    </section>
  </main>;
}
