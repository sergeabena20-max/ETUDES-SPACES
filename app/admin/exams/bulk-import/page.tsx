import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";
import BulkImportForm from "./bulk-import-form";

export const dynamic = "force-dynamic";

export default async function BulkImportPage() {
  const admin = await requireAdmin("exams.create");
  if (!admin) redirect("/dashboard");
  const [levels, subjects, schools, programs] = await Promise.all([
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
  ]);
  return <BulkImportForm levels={levels} subjects={subjects} schools={schools} programs={programs} />;
}
