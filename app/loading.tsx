export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50/70">
      <div className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="container flex items-center justify-between py-4">
          <div className="h-6 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
      <section className="container py-10">
        <div className="h-4 w-24 animate-pulse rounded bg-sky-100" />
        <div className="mt-4 h-10 w-72 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-slate-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
              <div className="mt-5 h-6 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
