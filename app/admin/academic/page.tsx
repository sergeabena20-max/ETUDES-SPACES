import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import AcademicManager from "./academic-manager";

export const dynamic = "force-dynamic";

export default async function AcademicPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");
  const [cities, schools, levels, programs, subjects] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { schools: true } } } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true, cityId: true, city: { select: { name: true } }, _count: { select: { users: true, courses: true, exams: true } } } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { users: true, courses: true, exams: true } } } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, _count: { select: { users: true, courses: true, exams: true } } } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { courses: true, exams: true } } } }),
  ]);
  return <main className="min-h-screen bg-slate-50"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"><Link href="/admin" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link><Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link></div></header><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link><div className="mb-8 mt-3"><h1 className="text-3xl font-black text-slate-900">Structure académique</h1><p className="mt-1 text-slate-500">Configure les villes, établissements, niveaux, filières, séries et matières avant la gestion des contenus.</p></div><AcademicManager initial={{cities,schools,levels,programs,subjects}} /></div></main>;
}