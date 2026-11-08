import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import ExamInboxManager from "./exam-inbox-manager";\nimport { uniqueAcademicLevels } from "@/lib/academic-level-label";

export const dynamic = "force-dynamic";

export default async function ExamInboxPage() {
  const admin = await requireAdmin("exams.read");
  if (!admin) redirect("/dashboard");
  const [initialExams, levels, subjects, schools, programs] = await Promise.all([
    prisma.exam.findMany({
      where: { category: "A_CLASSER", status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, fileUrl: true, createdAt: true },
    }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ where: { kind: "FILIERE" }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
  ]);
  const canonicalLevels = uniqueAcademicLevels(levels);\n  const serializableExams = initialExams.map((exam) => ({ ...exam, createdAt: exam.createdAt.toISOString() }));
  return <ExamInboxManager initialExams={serializableExams} levels={canonicalLevels} subjects={subjects} schools={schools} programs={programs} />;
}
