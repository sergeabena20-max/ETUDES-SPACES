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

  return <main className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link>
      <div className="mb-8 mt-2">
        <h1 className="text-3xl font-bold text-slate-900">Gestion des petits tests</h1>
        <p className="mt-1 text-slate-500">Créez des quiz simples par niveau, matière et filière. Vous pourrez en ajouter progressivement.</p>
      </div>
      <QuizzesManager initialQuizzes={quizzes} initialSubjects={subjects} initialLevels={levels} initialPrograms={programs} />
    </div>
  </main>;
}
