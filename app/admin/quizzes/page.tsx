import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import QuizzesManager from "./quizzes-manager";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  const admin = await requireAdmin("quizzes.read");
  if (!admin) redirect("/dashboard");

  const [quizzes, subjects, levels, programs] = await Promise.all([
    prisma.quiz.findMany({
      orderBy: { createdAt: "desc" }, take: 300,
      include: {
        subject: { select: { id: true, name: true } },
        academicLevel: { select: { id: true, name: true } },
        program: { select: { id: true, name: true } },
        questions: { orderBy: { order: "asc" } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50/60">
      <div className="pointer-events-none absolute -left-32 top-16 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-float" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin" className="rounded-xl px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-white hover:shadow-sm">← Administration</Link>
        <div className="mb-8 mt-4 animate-slide-up">
          <p className="text-sm font-bold text-sky-600">Administration</p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Gestion des petits tests</h1>
          <p className="mt-1 text-slate-500">Créez des quiz simples par niveau, matière et filière. Vous pourrez en ajouter progressivement.</p>
        </div>
        <div className="card animate-slide-up stagger-2 p-4 sm:p-6">
          <QuizzesManager initialQuizzes={quizzes} initialSubjects={subjects} initialLevels={levels} initialPrograms={programs} />
        </div>
      </div>
    </main>
  );
}
