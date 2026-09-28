import Link from "next/link";

const features = [
  ["📚","Cours","Des ressources organisées par matière et niveau."],
  ["📝","Épreuves","Entraîne-toi avec des épreuves et leurs corrections."],
  ["🧠","Petits tests","Révise avec de courts quiz par niveau et matière."],
  ["🔎","Recherche","Trouve rapidement le contenu dont tu as besoin."],
  ["❤️","Favoris","Garde tes cours et épreuves importants sous la main."]
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-[8%] top-32 h-4 w-4 rounded-full bg-sky-400 shadow-[0_0_30px_8px_rgba(56,189,248,.35)] animate-orbit" />
      <div className="pointer-events-none absolute right-[12%] top-56 h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_26px_7px_rgba(59,130,246,.3)] animate-orbit-reverse" />
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl animate-glow" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl animate-float" />

      <nav className="container relative z-10 flex items-center justify-between py-6 animate-slide-up">
        <Link href="/" className="text-xl font-black tracking-tight animate-bob">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-white/70">Connexion</Link>
          <Link href="/register" className="animate-shimmer rounded-xl bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-600/25">Créer mon compte</Link>
        </div>
      </nav>

      <section className="container relative z-10 grid items-center gap-12 py-16 lg:grid-cols-2">
        <div>
          <div className="animate-slide-up inline-flex rounded-full border border-sky-200 bg-white/70 px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur">
            🇨🇲 Pensé pour les élèves et étudiants camerounais
          </div>
          <h1 className="animate-slide-up stagger-1 mt-6 text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
            Apprendre.<br/><span className="gradient-text">S'entraîner.</span><br/>Réussir.
          </h1>
          <p className="animate-slide-up stagger-2 mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Études Space rassemble cours, épreuves et corrections dans un espace moderne, vivant et accessible.
          </p>
          <div className="animate-slide-up stagger-3 mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-2xl bg-sky-600 px-6 py-3.5 font-bold text-white shadow-xl shadow-sky-600/25">Commencer gratuitement →</Link>
            <Link href="/quizzes" className="rounded-2xl border border-white/80 bg-white/75 px-6 py-3.5 font-bold shadow-sm backdrop-blur">Faire un petit test</Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl animate-slide-up stagger-2" style={{ perspective: "1200px" }}>
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/20 blur-3xl animate-glow" />
          <div className="animate-float relative [transform-style:preserve-3d]">
            <div className="absolute -right-5 -top-8 z-20 animate-bob rounded-2xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur">
              <div className="text-2xl">⚡</div><div className="mt-1 text-xs font-black">RÉVISE</div>
            </div>
            <div className="absolute -bottom-7 -left-5 z-20 animate-bob rounded-2xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur" style={{animationDelay:"1.2s"}}>
              <div className="text-2xl">🎯</div><div className="mt-1 text-xs font-black">PROGRESSE</div>
            </div>
            <div className="card relative overflow-hidden p-5 shadow-2xl [transform:rotateY(-7deg)_rotateX(3deg)]">
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-cyan-400/20 blur-2xl animate-glow" />
              <div className="relative rounded-2xl bg-slate-950 p-6 text-white shadow-inner">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-slate-400">Ton espace d'apprentissage</p><h2 className="mt-2 text-2xl font-bold">Bonjour 👋🏾</h2></div>
                  <div className="animate-pulse-soft rounded-full bg-sky-400/20 px-3 py-2 text-sky-300">●</div>
                </div>
                <p className="mt-1 text-slate-300">Que veux-tu apprendre aujourd'hui ?</p>
                <div className="animate-shimmer mt-6 rounded-xl bg-gradient-to-r from-white/10 via-white/20 to-white/10 px-4 py-3 text-slate-400">🔎 Rechercher une matière, une épreuve...</div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {features.slice(0,3).map(([i,t], index) => (
                    <div key={t} className={"animate-bob rounded-xl bg-white/10 p-3 transition hover:-translate-y-2 hover:bg-white/15"} style={{animationDelay:index*".5"+"s"}}>
                      <div className="text-xl">{i}</div><div className="mt-2 text-sm font-semibold">{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container relative z-10 grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([icon,title,text], index) => (
          <div key={title} className={"card animate-slide-up p-5 " + ["stagger-1","stagger-2","stagger-3","stagger-4","stagger-5"][index]}>
            <div className="animate-bob text-2xl" style={{animationDelay:index*.25+"s"}}>{icon}</div>
            <h3 className="mt-4 font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}