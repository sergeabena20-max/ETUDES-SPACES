import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import ExamsManager from "./exams-manager";

export const dynamic = "force-dynamic";

export default async function AdminExamsPage() {
  const admin = await requireAdmin("exams.read");
  if (!admin) redirect("/dashboard");

  const [exams, subjects, levels, schools, programs] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        subject: { select: { name: true } },
        academicLevel: { select: { name: true } },
        school: { select: { name: true } },
        program: { select: { name: true } },
        solution: { select: { text: true, fileUrl: true } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link>
        <div className="mb-8 mt-2">
          <h1 className="text-3xl font-bold text-slate-900">Gestion des épreuves</h1>
          <p className="mt-1 text-slate-500">Anciens sujets, épreuves, documents et corrections.</p>
        </div>
        <ExamsManager initialExams={exams} initialSubjects={subjects} initialLevels={levels} initialSchools={schools} initialPrograms={programs} />
      </div>
    </main>
  );
}
