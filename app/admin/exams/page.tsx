import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AdminExamsPage() {
  const admin = await requireAdmin("exams.read");
  if (!admin) redirect("/dashboard");
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    select: { id:true,title:true,slug:true,status:true,isPremium:true,year:true,category:true,createdAt:true,subject:{select:{name:true}},academicLevel:{select:{name:true}} },
    take: 200,
  });
  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link>
    <div className="mb-8 mt-2"><h1 className="text-3xl font-bold text-slate-900">Gestion des épreuves</h1><p className="mt-1 text-slate-500">Suivez les épreuves, leur publication et leurs documents.</p></div>
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Épreuve</th><th className="px-5 py-4">Année</th><th className="px-5 py-4">Catégorie</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">PDF</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{exams.map(e=><tr key={e.id} className="hover:bg-slate-50"><td className="px-5 py-4"><div className="font-semibold text-slate-900">{e.title}</div><div className="text-xs text-slate-400">{e.slug}</div></td><td className="px-5 py-4">{e.year ?? "—"}</td><td className="px-5 py-4">{e.category ?? "—"}</td><td className="px-5 py-4">{e.status}</td><td className="px-5 py-4">{e.fileUrl ? "Disponible" : "À ajouter"}</td></tr>)}{exams.length===0&&<tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Aucune épreuve pour le moment.</td></tr>}</tbody>
    </table></div></div>
  </div></main>;
}
