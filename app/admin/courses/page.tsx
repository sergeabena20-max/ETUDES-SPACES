import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const admin = await requireAdmin("courses.read");
  if (!admin) redirect("/dashboard");
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    select: { id:true,title:true,slug:true,status:true,isPremium:true,createdAt:true,subject:{select:{name:true}},academicLevel:{select:{name:true}} },
    take: 200,
  });
  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link>
    <div className="mb-8 mt-2"><h1 className="text-3xl font-bold text-slate-900">Gestion des cours</h1><p className="mt-1 text-slate-500">Préparation du catalogue pédagogique et de sa publication.</p></div>
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Cours</th><th className="px-5 py-4">Matière</th><th className="px-5 py-4">Niveau</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Accès</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{courses.map(c=><tr key={c.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{c.title}</div><div className="text-xs text-slate-400">{c.slug}</div></td><td className="px-5 py-4">{c.subject?.name ?? "—"}</td><td className="px-5 py-4">{c.academicLevel?.name ?? "—"}</td><td className="px-5 py-4">{c.status}</td><td className="px-5 py-4">{c.isPremium ? "Premium" : "Gratuit"}</td></tr>)}{courses.length===0&&<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Aucun cours pour le moment.</td></tr>}</tbody>
    </table></div></div>
  </div></main>;
}
