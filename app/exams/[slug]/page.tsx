import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import ExamActions from "./exam-actions";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exam = await prisma.exam.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { subject: true, academicLevel: true, school: true, program: true, solution: true },
  });
  if (!exam) notFound();

  const user = await getCurrentUser();
  const [existingFavorite, comments] = await Promise.all([
    user ? prisma.favorite.findFirst({ where: { userId: user.id, examId: exam.id }, select: { id: true } }) : null,
    prisma.comment.findMany({
      where: { examId: exam.id },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const serializedComments = comments.map((comment) => ({
    id: comment.id,
    userId: comment.userId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
  }));

  return <main className="min-h-screen">
    <header className="border-b bg-white"><div className="container flex items-center justify-between py-4">
      <Link href="/exams" className="text-sm font-semibold text-sky-600">← Toutes les épreuves</Link>
      <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
    </div></header>
    <section className="container max-w-4xl py-10">
      <div className="text-sm font-bold text-sky-600">{exam.subject?.name || "Matière"} · {exam.year || "Année non précisée"}</div>
      <h1 className="mt-2 text-4xl font-black">{exam.title}</h1>
      <p className="mt-4 text-slate-600">{exam.description || "Ancienne épreuve disponible pour entraînement."}</p>
      <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600">
        {exam.academicLevel && <span className="rounded-full bg-slate-100 px-3 py-1">{exam.academicLevel.name}</span>}
        {exam.program && <span className="rounded-full bg-slate-100 px-3 py-1">{exam.program.name}</span>}
        {exam.school && <span className="rounded-full bg-slate-100 px-3 py-1">{exam.school.name}</span>}
      </div>

      <ExamActions
        examId={exam.id}
        initialFavorite={Boolean(existingFavorite)}
        initialComments={serializedComments}
        isAuthenticated={Boolean(user)}
        currentUserId={user?.id ?? null}
      />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">Sujet</h2>
        {exam.fileUrl ? <a href={exam.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Ouvrir le sujet PDF →</a> : <p className="mt-3 text-sm text-slate-500">Le document du sujet sera ajouté prochainement.</p>}
      </div>

      <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold">Correction</h2>
        {exam.solution?.text ? <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{exam.solution.text}</div> : null}
        {exam.solution?.fileUrl ? <a href={exam.solution.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-xl border px-5 py-3 font-bold">Ouvrir la correction PDF →</a> : null}
        {!exam.solution?.text && !exam.solution?.fileUrl && <p className="mt-3 text-sm text-slate-500">La correction de cette épreuve n'est pas encore disponible.</p>}
      </div>
    </section>
  </main>;
}
