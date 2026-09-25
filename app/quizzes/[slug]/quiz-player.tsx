"use client";

import { useMemo, useState } from "react";

type Question = {
  id: string; question: string;
  options: Record<"A" | "B" | "C" | "D", string>;
  explanation: string | null;
};

type Correction = {
  id: string; selected: "A" | "B" | "C" | "D" | null;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string | null;
};

export default function QuizPlayer({ questions, slug }: { questions: Question[]; slug: string }) {
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  const correctionMap = useMemo(() => new Map(corrections.map((c) => [c.id, c])), [corrections]);

  async function submit() {
    if (answered < questions.length || loading) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/quizzes/${slug}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Impossible de corriger le test."); setLoading(false); return; }
    setResult({ score: data.score, total: data.total });
    setCorrections(data.corrections);
    setLoading(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() { setAnswers({}); setCorrections([]); setResult(null); setError(""); }

  return <div className="mt-8 space-y-5">
    {result && <div className="rounded-2xl bg-sky-50 p-6 ring-1 ring-sky-100">
      <p className="text-sm font-semibold text-sky-700">Résultat</p>
      <h2 className="mt-1 text-3xl font-black">{result.score} / {result.total}</h2>
      <p className="mt-1 text-sm text-slate-600">Voici ta correction question par question.</p>
      <button onClick={restart} className="mt-4 rounded-xl border bg-white px-4 py-2 text-sm font-bold">Recommencer</button>
    </div>}

    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

    {questions.map((q, index) => {
      const correction = correctionMap.get(q.id);
      return <article key={q.id} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs font-bold uppercase text-slate-400">Question {index + 1} / {questions.length}</div>
        <h2 className="mt-2 text-lg font-bold">{q.question}</h2>
        <div className="mt-4 grid gap-3">
          {(["A","B","C","D"] as const).map(letter => {
            const selected = answers[q.id] === letter;
            const correct = Boolean(correction && correction.correctOption === letter);
            const wrong = Boolean(correction && selected && !correct);
            return <button key={letter} type="button" disabled={Boolean(result)} onClick={() => setAnswers(a => ({ ...a, [q.id]: letter }))} className={`w-full rounded-xl border px-4 py-3 text-left transition ${correct ? "border-emerald-400 bg-emerald-50" : wrong ? "border-red-300 bg-red-50" : selected ? "border-sky-400 bg-sky-50" : "hover:border-sky-300 hover:bg-slate-50"}`}><span className="mr-2 font-black">{letter}.</span>{q.options[letter]}</button>;
          })}
        </div>
        {correction && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">Bonne réponse : {correction.correctOption}</p>{correction.explanation && <p className="mt-1 text-slate-600">{correction.explanation}</p>}</div>}
      </article>;
    })}

    {!result && <button disabled={answered < questions.length || loading} onClick={submit} className="w-full rounded-2xl bg-sky-600 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? "Correction..." : `Terminer le test (${answered}/${questions.length})`}</button>}
  </div>;
}
