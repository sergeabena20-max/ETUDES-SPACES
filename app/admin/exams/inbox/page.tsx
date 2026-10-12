import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import ExamInboxManager from "./exam-inbox-manager";

export const dynamic = "force-dynamic";

export default async function ExamInboxPage() {
  const admin = await requireAdmin("exams.read");
  if (!admin) redirect("/dashboard");
  const [levels, subjects, schools, programs] = await Promise.all([
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ where: { kind: "FILIERE" }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
  ]);
  return <ExamInboxManager levels={levels} subjects={subjects} schools={schools} programs={programs} />;
}
