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
    <main className="min-h-screen overflow-hidden">
      <nav className="container flex items-center justify-between py-6">
        <Link href="/" className="text-xl font-black tracking-tight">Études <span className="gradient-text">Space</span> 🇨🇲</Link>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-100">Connexion</Link>
          <Link href="/register" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-600/20">Créer mon compte</Link>
        </div>
      </nav>
      <section className="container grid items-center gap-12 py-20 lg:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">🇨🇲 Pensé pour les élèves et étudiants camerounais</div>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">Apprendre.<br/><span className="gradient-text">S'entraîner.</span><br/>Réussir.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Études Space rassemble cours, épreuves et corrections dans un espace simple, rapide et accessible. La plateforme commence gratuitement avec des contenus francophones.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-2xl bg-sky-600 px-6 py-3.5 font-bold text-white shadow-xl shadow-sky-600/20">Commencer gratuitement →</Link>
            <Link href="/quizzes" className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold">Faire un petit test</Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">🇫🇷 Français · 🇬🇧 English version coming soon.</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-sky-200/30 blur-3xl"/>
          <div className="card relative p-6">
            <div className="rounded-2xl bg-slate-950 p-6 text-white">
              <p className="text-sm text-slate-400">Ton espace d'apprentissage</p>
              <h2 className="mt-2 text-2xl font-bold">Bonjour 👋🏾</h2>
              <p className="mt-1 text-slate-300">Que veux-tu apprendre aujourd'hui ?</p>
              <div className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-slate-400">🔎 Rechercher une matière, une épreuve...</div>
              <div className="mt-4 grid grid-cols-3 gap-3">{features.slice(0,3).map(([i,t])=><div key={t} className="rounded-xl bg-white/10 p-3"><div className="text-xl">{i}</div><div className="mt-2 text-sm font-semibold">{t}</div></div>)}</div>
            </div>
          </div>
        </div>
      </section>
      <section className="container grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">{features.map(([icon,title,text])=><div key={title} className="card p-5"><div className="text-2xl">{icon}</div><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</section>
    </main>
  );
}