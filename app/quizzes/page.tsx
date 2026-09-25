import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canAccessQuiz } from "@/lib/quiz-access";

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  const user = await getCurrentUser();
  const quizzes = await prisma.quiz.findMany({
    where: { status: "PUBLISHED" },
    include: { subject: true, academicLevel: true, program: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const visibleQuizzes = user ? quizzes.filter((quiz) => canAccessQuiz(user, quiz)) : quizzes;

  return <main className="min-h-screen">
    <header className="border-b bg-white"><div className="container flex items-center justify-between py-4">
      <Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
      <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
    </div></header>
    <section className="container py-10">
      <p className="text-sm font-semibold text-sky-600">🧠 Entraînement</p>
      <h1 className="mt-2 text-4xl font-black">Petits tests</h1>
      <p className="mt-2 max-w-2xl text-slate-500">Des quiz courts adaptés à ta classe ou à ton niveau. Les tests affichés correspondent automatiquement à ton profil.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleQuizzes.length ? visibleQuizzes.map(q => <article key={q.id} className="card p-5">
          <div className="text-xs font-bold uppercase text-sky-600">{q.subject?.name || "Matière"} · {q._count.questions} questions</div>
          <h2 className="mt-3 text-xl font-bold">{q.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{q.description || "Petit test d'entraînement."}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            {q.academicLevel && <span className="rounded-full bg-slate-100 px-3 py-1">{q.academicLevel.name}</span>}
            {q.program && <span className="rounded-full bg-slate-100 px-3 py-1">{q.program.name}</span>}
          </div>
          <Link href={"/quizzes/" + q.slug} className="mt-5 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">Commencer le test →</Link>
        </article>) : <div className="card p-8 md:col-span-3"><h2 className="font-bold">Aucun petit test pour ton profil pour le moment.</h2><p className="mt-2 text-sm text-slate-500">De nouveaux tests seront ajoutés progressivement.</p></div>}
      </div>
    </section>
  </main>;
}
