import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AdminSearchesPage() {
  const admin = await requireAdmin("analytics.read");
  if (!admin) redirect("/dashboard");
  const rows = await prisma.searchNoResult.findMany({ orderBy:{createdAt:"desc"}, take:200 });
  const grouped = rows.reduce<Record<string, number>>((acc,row)=>{ const key=row.query.trim().toLowerCase(); acc[key]=(acc[key]??0)+1; return acc; },{});
  const popular = Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,50);
  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
    <Link href="/admin" className="text-sm font-medium text-sky-600">← Administration</Link>
    <div className="mb-8 mt-2"><h1 className="text-3xl font-bold text-slate-900">Recherches sans résultat</h1><p className="mt-1 text-slate-500">Ces requêtes peuvent aider à identifier les contenus à ajouter.</p></div>
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><div className="space-y-2">{popular.map(([query,count])=><div key={query} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="font-medium text-slate-800">{query}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{count} recherche{count>1?"s":""}</span></div>)}{popular.length===0&&<p className="py-10 text-center text-slate-500">Aucune recherche sans résultat enregistrée.</p>}</div></div>
  </div></main>;
}
