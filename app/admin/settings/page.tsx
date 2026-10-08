import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";
import SettingsManager from "./settings-manager";
import PlatformSettingsManager from "./platform-settings-manager";
import GamificationLevelsManager from "./gamification-levels-manager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requireSuperAdmin();
  if (!admin) redirect("/dashboard");

  const [programs, settings, levels] = await Promise.all([
    prisma.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true, _count: { select: { users: true, exams: true, courses: true, quizzes: true } } },
    }),
    prisma.platformSetting.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] }),
    prisma.gamificationLevel.findMany({ orderBy: [{ order: "asc" }, { minPoints: "asc" }] }),
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50/60">
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-float" />
      <header className="relative z-10 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between py-4">
          <Link href="/admin" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
          <Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link>
        </div>
      </header>
      <section className="container relative z-10 max-w-6xl py-10">
        <Link href="/admin" className="text-sm font-semibold text-sky-600">← Administration</Link>
        <div className="mt-4">
          <p className="text-sm font-bold text-sky-600">SUPER ADMIN</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight">Paramètres de la plateforme</h1>
          <p className="mt-2 max-w-3xl text-slate-500">
            Centralise ici les réglages qui ne doivent plus nécessiter une modification du code.
          </p>
        </div>
        <PlatformSettingsManager
          initialSettings={settings.map((setting) => ({
            ...setting,
            type: setting.type as "STRING" | "NUMBER" | "BOOLEAN",
          }))}
        />
        <SettingsManager initialPrograms={programs} />
        <GamificationLevelsManager initialLevels={levels} />
      </section>
    </main>
  );
}
