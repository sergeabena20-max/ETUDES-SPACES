import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getExamAccessMap } from "@/lib/premium";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; year?: string; level?: string; program?: string; department?: string; universityLevel?: string; category?: string }> };

export default async function ExamsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim();
  const year = params.year ? Number(params.year) : undefined;
  const levelId = params.level;
  const programId = params.program;
  const departmentId = params.department;
  const universityLevelId = params.universityLevel;
  const category = params.category;
  const selected = levelId || programId || departmentId;
  const [user, allLevels, programs] = await Promise.all([
    getCurrentUser(),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, _count: { select: { exams: { where: { status: "PUBLISHED" } } } } } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, parentId: true, parent: { select: { id: true, name: true } }, programLevels: { orderBy: { order: "asc" }, select: { academicLevelId: true, academicLevel: { select: { id: true, name: true, kind: true, _count: { select: { exams: { where: { status: "PUBLISHED" } } } } } } } }, _count: { select: { exams: { where: { status: "PUBLISHED" } } } } } }),
  ]);
  const levels = allLevels.filter((x) => x.kind === "SCOLAIRE");
  const selectedAcademicLevelId = levelId || universityLevelId;
  const selectedLevel = selectedAcademicLevelId ? allLevels.find((x) => x.id === selectedAcademicLevelId) : null;
  const selectedProgram = programId ? programs.find((x) => x.id === programId) : null;
  const selectedDepartment = departmentId ? programs.find((x) => x.id === departmentId && x.kind === "DEPARTEMENT") : null;
  const departmentPrograms = selectedDepartment ? programs.filter((x) => x.kind === "FILIERE" && x.parentId === selectedDepartment.id) : [];
  const universityLevels = selectedProgram ? selectedProgram.programLevels.map((item) => item.academicLevel) : [];
  const classExamConfig = selectedLevel ? await prisma.classExamConfig.findUnique({ where: { academicLevelId: selectedLevel.id } }) : null;
  const isUniversityLevel = selectedLevel?.kind === "UNIVERSITAIRE";
  const isLevelTwo = selectedLevel ? /\bniv(?:eau)?\s*2\b/i.test(selectedLevel.name) : false;
  const categoryOptions = selectedLevel ? (
    isUniversityLevel
      ? [
          { id: "EXERCICE", label: "Exercices", enabled: classExamConfig?.exercisesEnabled ?? true },
          { id: "CONTROLE_CONTINU", label: "Contrôle continu (CC)", enabled: classExamConfig?.continuousAssessmentEnabled ?? true },
          { id: "SESSION_NORMALE", label: "Session normale", enabled: classExamConfig?.normalSessionEnabled ?? true },
          { id: "SIMULATION_BTS_DUT", label: "Simulation d’examen BTS / DUT", enabled: isLevelTwo && (classExamConfig?.btsDutExamEnabled ?? true) },
        ].filter((item) => item.enabled)
      : [
          { id: "EXERCICE", label: "Exercices", enabled: classExamConfig?.exercisesEnabled ?? true },
          { id: "ANCIEN_SUJET", label: "Anciens sujets d’examen", enabled: classExamConfig?.isExamClass === true && (classExamConfig?.pastExamsEnabled ?? false) },
          { id: "EXAMEN_BLANC", label: "Examens blancs", enabled: classExamConfig?.isExamClass === true && (classExamConfig?.mockExamsEnabled ?? false) },
        ].filter((item) => item.enabled)
  ) : [];
  const requestedCategory = category === "ALL" || categoryOptions.some((item) => item.id === category) ? category : undefined;
  const activeCategory = selectedLevel ? (requestedCategory || categoryOptions[0]?.id || "ALL") : category;

  const [exams, years] = (levelId || programId) ? await Promise.all([
    prisma.exam.findMany({
    where: {
      status: "PUBLISHED",
      ...(levelId ? { academicLevelId: levelId } : {}),
      ...(programId ? { programId } : {}),
      ...(universityLevelId ? { academicLevelId: universityLevelId } : {}),
      ...(year && Number.isInteger(year) ? { year } : {}),
      ...(selectedLevel && activeCategory && activeCategory !== "ALL" ? { category: activeCategory } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { subject: { name: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    },
    include: { subject: true, academicLevel: true, program: true, solution: true },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: 60,
    }),
    prisma.exam.findMany({
    where: { status: "PUBLISHED", ...(levelId ? { academicLevelId: levelId } : {}), ...(programId ? { programId } : {}), ...(universityLevelId ? { academicLevelId: universityLevelId } : {}), year: { not: null } },
      select: { year: true }, distinct: ["year"], orderBy: { year: "desc" }, take: 30,
    }),
  ]) : [[], []];

  const accessByExam =
    user && user.type !== "ADMIN" && user.type !== "SUPER_ADMIN"
      ? await getExamAccessMap(user.id, exams.filter((e) => e.isPremium).map((e) => e.id))
      : new Map<string, boolean>();

  return <main className="relative min-h-screen overflow-hidden">
    <div className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl animate-float-slow" />
    <div className="pointer-events-none absolute -right-28 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-float" />
    <header className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl"><div className="container flex items-center justify-between py-4"><Link href="/" className="font-black">Études <span className="gradient-text">Space</span> 🇨🇲</Link><Link href="/dashboard" className="text-sm font-semibold text-sky-600">Mon espace</Link></div></header>
    <section className="container relative z-10 py-10">
      <p className="text-sm font-semibold text-sky-600">📝 Épreuves</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Choisis ta rubrique</h1>
      <p className="mt-2 max-w-3xl text-slate-500">Les épreuves sont séparées par classe, série ou filière. Aucun niveau n'est mélangé avec un autre.</p>

      {!selected ? <div className="mt-10 space-y-10">
        <section>
          <div className="mb-4"><span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">👨🏾‍🎓 Élèves</span><h2 className="mt-3 text-2xl font-black">Une rubrique par niveau / série</h2><p className="mt-1 text-sm text-slate-500">6e, 5e, 4e, 3e, Seconde A/C/D, Première A/C/D, Terminale A/C/D… chacun possède son espace.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{levels.map((level) => <Link key={level.id} href={"/exams?level=" + level.id} className="card group p-4"><div className="flex items-center justify-between"><span className="text-xl">📚</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">{level._count.exams} sujet{level._count.exams > 1 ? "s" : ""}</span></div><h3 className="mt-3 text-base font-black group-hover:text-sky-600">{level.name}</h3><p className="mt-1 text-sm text-slate-500">Accéder à {level.name} →</p></Link>)}</div>
        </section>
        <section>
          <div className="mb-4"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">🎓 Étudiants</span><h2 className="mt-2 text-xl font-black">Départements universitaires</h2><p className="mt-1 text-sm text-slate-500">Choisis d'abord un département, puis sa filière et son niveau.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {programs.filter((program) => program.kind === "DEPARTEMENT").map((department) => {
              const children = programs.filter((program) => program.kind === "FILIERE" && program.parentId === department.id);
              return <Link key={department.id} href={"/exams?department=" + department.id} className="card group p-4">
                <div className="flex items-center justify-between gap-3"><span className="text-xl">🏛️</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">{children.length} filière{children.length > 1 ? "s" : ""}</span></div>
                <h3 className="mt-3 text-base font-black group-hover:text-sky-600">{department.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{children.length ? children.map((item) => item.name).join(" · ") : "Aucune filière rattachée"}</p>
              </Link>;
            })}
          </div>
        </section>
      </div> : <div className="mt-8">
        <Link href="/exams" className="text-sm font-bold text-sky-600">← Toutes les rubriques</Link>
        <div className="card mt-5 p-5"><p className="text-xs font-bold text-sky-600">{selectedLevel ? (isUniversityLevel ? "ÉTUDIANT" : "ÉLÈVE") : selectedDepartment ? "DÉPARTEMENT" : "ÉTUDIANT"}</p><h2 className="mt-1 text-2xl font-black">{isUniversityLevel ? [selectedProgram?.name, selectedLevel?.name].filter(Boolean).join(" · ") : selectedLevel?.name || selectedProgram?.name || selectedDepartment?.name}</h2><p className="mt-1 text-sm text-slate-500">{selectedLevel ? (isUniversityLevel ? "Épreuves universitaires de ce niveau et de cette filière." : "Épreuves exclusivement destinées à cette classe/série.") : selectedDepartment ? "Sélectionne une filière de ce département." : "Épreuves de cette filière, avec séparation par niveau."}</p>
          {selectedDepartment && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{departmentPrograms.map((program) => <Link key={program.id} href={"/exams?program=" + program.id} className="rounded-xl border bg-white p-3 hover:border-sky-300"><div className="text-sm font-black">{program.name}</div><div className="mt-1 text-xs text-slate-500">{program._count.exams} sujet{program._count.exams > 1 ? "s" : ""}</div></Link>)}</div>}
          {selectedProgram && <div className="mb-5 mt-4 flex flex-wrap gap-2">{universityLevels.map((level) => <Link key={level.id} href={"/exams?program=" + selectedProgram.id + "&universityLevel=" + level.id} className={"rounded-xl border px-3 py-2 text-sm font-bold " + (universityLevelId === level.id ? "border-sky-500 bg-sky-50 text-sky-700" : "bg-white text-slate-600")}>{level.name}</Link>)}<Link href={"/exams?program=" + selectedProgram.id} className="rounded-xl border px-3 py-2 text-sm font-bold">Tous les niveaux</Link></div>}
          {selectedLevel && <nav aria-label="Rubriques du niveau" className="mt-5 flex flex-wrap gap-2">
            {categoryOptions.map((item) => <Link key={item.id} href={(isUniversityLevel && programId ? "/exams?program=" + programId + "&universityLevel=" + selectedLevel.id : "/exams?level=" + selectedLevel.id) + "&category=" + item.id} className={"rounded-xl border px-4 py-2 text-sm font-bold transition " + ((activeCategory || "EXERCICE") === item.id ? "border-sky-500 bg-sky-600 text-white shadow-md shadow-sky-600/20" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300")}>{item.label}</Link>)}
            <Link href={(isUniversityLevel && programId ? "/exams?program=" + programId + "&universityLevel=" + selectedLevel.id : "/exams?level=" + selectedLevel.id) + "&category=ALL"} className={"rounded-xl border px-4 py-2 text-sm font-bold " + (activeCategory === "ALL" ? "border-sky-500 bg-sky-600 text-white" : "border-slate-200 bg-white text-slate-600")}>Toutes les épreuves</Link>
          </nav>}
          {selectedLevel && !categoryOptions.length && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Aucune rubrique n’est activée pour cette classe. Le Super Administrateur peut les configurer dans Paramètres de la plateforme.</p>}
          <form className="mt-6 grid gap-3 md:grid-cols-[1fr_180px_auto]"><input type="hidden" name={levelId ? "level" : "program"} value={selected} />{universityLevelId && <input type="hidden" name="universityLevel" value={universityLevelId} />}<input name="q" defaultValue={q} placeholder="Rechercher une matière ou une épreuve..." className="rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-sky-200" /><select name="year" defaultValue={year?.toString() || ""} className="rounded-xl border px-4 py-3"><option value="">Toutes les années</option>{years.map((x) => <option key={x.year} value={x.year!}>{x.year}</option>)}</select><button className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white">Rechercher</button></form>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{exams.length ? exams.map((e) => { const access = !e.isPremium || accessByExam.get(e.id) === true || user?.type === "ADMIN" || user?.type === "SUPER_ADMIN"; return <article key={e.id} className="card p-5"><div className="text-xs font-bold uppercase text-sky-600">{e.subject?.name || "Matière"} · {e.year || "—"}</div><h3 className="mt-3 text-xl font-bold">{e.title}</h3><p className="mt-2 text-sm text-slate-500">{e.description || "Épreuve disponible."}</p>{e.isPremium && !access && <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">🔒 Épreuve Premium · <Link href={"/premium?exam=" + e.id} className="underline">Activer Premium</Link></div>}<div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">{e.isPremium && <span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">⭐ Premium</span>}<span className="rounded-full bg-slate-100 px-3 py-1">{selectedLevel?.name || selectedProgram?.name}</span></div><div className="mt-5 flex flex-wrap gap-3"><Link href={"/exams/" + e.slug} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white">{e.isPremium && !access ? "Voir les conditions Premium" : "Voir l’épreuve"}</Link>{e.fileUrl && access && <a className="rounded-xl border px-4 py-2 text-sm font-bold" href={e.fileUrl} target="_blank" rel="noreferrer">Voir le PDF</a>}{e.fileUrl && access && <a className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700" href={"/api/exams/" + e.id + "/download"}>Télécharger ↓</a>}{e.solution?.fileUrl && access && <a className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700" href={"/api/exams/" + e.id + "/download?kind=solution"}>Correction ↓</a>}</div></article>; }) : <div className="card p-8 md:col-span-3"><h3 className="font-bold">Aucune épreuve publiée ici pour le moment.</h3><p className="mt-2 text-sm text-slate-500">L'administration pourra ajouter les sujets directement dans cette rubrique.</p></div>}</div>
      </div>}
    </section>
  </main>;
}
