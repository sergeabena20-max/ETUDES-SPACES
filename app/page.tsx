import Link from "next/link";

const features = [
  { number: "01", title: "Cours bien organisés", description: "Retrouve les ressources par classe, matière et filière." },
  { number: "02", title: "Épreuves et corrections", description: "Prépare tes examens avec des sujets adaptés à ton niveau." },
  { number: "03", title: "Entraînement régulier", description: "Teste tes connaissances et mesure tes progrès au fil du temps." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <header className="site-header sticky top-0 z-40">
        <nav className="container flex h-[76px] items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-3" aria-label="Études Space, accueil">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1769e0] text-lg font-black text-white">É</span>
            <span className="text-lg font-extrabold tracking-tight text-[#14253d]">Études <span className="text-[#1769e0]">Space</span></span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/courses" className="transition hover:text-blue-700">Cours</Link>
            <Link href="/exams" className="transition hover:text-blue-700">Épreuves</Link>
            <Link href="/quizzes" className="transition hover:text-blue-700">Entraînement</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:px-4">Connexion</Link>
            <Link href="/register" className="rounded-lg bg-[#1769e0] px-3 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#124fb0] sm:px-5">Créer un compte</Link>
          </div>
        </nav>
      </header>

      <section className="relative border-b border-slate-100 bg-[#f5f9ff]">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] bg-[#eaf3ff] lg:block" />
        <div className="container relative grid items-center gap-12 py-14 sm:py-20 lg:min-h-[590px] lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">La réussite scolaire, mieux préparée</p>
            <h1 className="mt-5 max-w-[680px] text-4xl font-extrabold leading-[1.08] tracking-[-.045em] text-[#14253d] sm:text-5xl lg:text-[62px]">
              Toutes tes révisions.<br /><span className="text-[#1769e0]">Au même endroit.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Cours, épreuves et entraînements réunis dans un espace conçu pour accompagner les élèves et étudiants du Cameroun.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1769e0] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,105,224,.18)] hover:bg-[#124fb0]">
                Commencer gratuitement <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <Link href="/exams" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                Explorer les épreuves
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ressources classées par niveau</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Accessible sur mobile</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div className="absolute -right-5 -top-5 h-28 w-28 rounded-2xl border border-blue-100 bg-white/70" />
            <div className="absolute -bottom-5 -left-5 h-24 w-24 rounded-2xl bg-[#dbeaff]" />
            <div className="relative overflow-hidden rounded-2xl border border-[#e0e8f3] bg-white shadow-[0_24px_70px_rgba(27,61,108,.13)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-extrabold text-blue-700">ÉS</span>
                  <div><p className="text-sm font-bold text-slate-800">Mon espace d’étude</p><p className="mt-0.5 text-xs text-slate-500">Tout pour progresser</p></div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">En ligne</span>
              </div>
              <div className="p-5 sm:p-6">
                <div className="rounded-xl bg-[#1769e0] p-5 text-white sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-[.13em] text-blue-100">Ton objectif</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">Prépare ta réussite.</h2>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-blue-100">Avance à ton rythme avec les bonnes ressources.</p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full w-[68%] rounded-full bg-white" /></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link href="/courses" className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h7"/></svg></span>
                    <p className="mt-3 text-sm font-bold text-slate-800">Mes cours</p><p className="mt-1 text-xs text-slate-500">Apprendre les notions</p>
                  </Link>
                  <Link href="/exams" className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><path d="M8 4h8M9 3h6v3H9z"/><rect x="5" y="5" width="14" height="16" rx="2"/><path d="m8 12 2 2 5-5M8 17h8"/></svg></span>
                    <p className="mt-3 text-sm font-bold text-slate-800">Épreuves</p><p className="mt-1 text-xs text-slate-500">S’entraîner en pratique</p>
                  </Link>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div><p className="text-sm font-bold text-slate-800">Un pas après l’autre</p><p className="mt-1 text-xs text-slate-500">La régularité fait la différence.</p></div>
                  <span className="text-lg font-bold text-blue-700" aria-hidden="true">↗</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="eyebrow">Une méthode plus simple</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#14253d] sm:text-4xl">Tout ce qu’il te faut pour avancer.</h2></div>
          <p className="max-w-md text-sm leading-6 text-slate-500">Des outils utiles, une organisation claire et moins de temps perdu à chercher tes supports.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.number} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
              <span className="text-xs font-extrabold tracking-[.15em] text-blue-700">{feature.number}</span>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-[#14253d]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container pb-16 sm:pb-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[#14253d] px-6 py-9 text-white sm:flex-row sm:items-center sm:px-10 sm:py-10">
          <div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-200">Études Space · Cameroun</p><h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Prêt à mieux préparer tes examens ?</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Crée ton espace et retrouve tes ressources au même endroit.</p></div>
          <Link href="/register" className="inline-flex shrink-0 items-center rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#14253d] hover:bg-blue-50">Créer mon compte <span className="ml-2">→</span></Link>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white">
        <div className="container flex flex-col gap-3 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-slate-700">Études Space 🇨🇲</p><p>Apprendre. S’entraîner. Réussir.</p>
          <div className="flex gap-4"><Link href="/courses" className="hover:text-blue-700">Cours</Link><Link href="/exams" className="hover:text-blue-700">Épreuves</Link><Link href="/login" className="hover:text-blue-700">Connexion</Link></div>
        </div>
      </footer>
    </main>
  );
}
