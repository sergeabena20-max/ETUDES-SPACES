"use client";

import { useMemo, useState } from "react";

type Question = {
  id: string; question: string;
  options: Record<"A" | "B" | "C" | "D", string>;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string | null;
};

export default function QuizPlayer({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => questions.reduce((n, q) => n + (answers[q.id] === q.correctOption ? 1 : 0), 0), [answers, questions]);
  const answered = Object.keys(answers).length;

  function submit() {
    if (answered < questions.length) return;
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="mt-8 space-y-5">
    {submitted && <div className="rounded-2xl bg-sky-50 p-6 ring-1 ring-sky-100"><p className="text-sm font-semibold text-sky-700">Résultat</p><h2 className="mt-1 text-3xl font-black">{score} / {questions.length}</h2><p className="mt-1 text-sm text-slate-600">Tu as répondu à toutes les questions. Tu peux revoir chaque correction ci-dessous.</p><button onClick={() => { setAnswers({}); setSubmitted(false); }} className="mt-4 rounded-xl border bg-white px-4 py-2 text-sm font-bold">Recommencer</button></div>}

    {questions.map((q, index) => <article key={q.id} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-bold uppercase text-slate-400">Question {index + 1} / {questions.length}</div>
      <h2 className="mt-2 text-lg font-bold">{q.question}</h2>
      <div className="mt-4 grid gap-3">
        {(["A","B","C","D"] as const).map(letter => {
          const selected = answers[q.id] === letter;
          const correct = submitted && q.correctOption === letter;
          const wrong = submitted && selected && !correct;
          return <button key={letter} type="button" disabled={submitted} onClick={() => setAnswers(a => ({ ...a, [q.id]: letter }))} className={`w-full rounded-xl border px-4 py-3 text-left transition ${correct ? "border-emerald-400 bg-emerald-50" : wrong ? "border-red-300 bg-red-50" : selected ? "border-sky-400 bg-sky-50" : "hover:border-sky-300 hover:bg-slate-50"}`}><span className="mr-2 font-black">{letter}.</span>{q.options[letter]}</button>;
        })}
      </div>
      {submitted && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">Bonne réponse : {q.correctOption}</p>{q.explanation && <p className="mt-1 text-slate-600">{q.explanation}</p>}</div>}
    </article>)}

    {!submitted && <button disabled={answered < questions.length} onClick={submit} className="w-full rounded-2xl bg-sky-600 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Terminer le test ({answered}/{questions.length})</button>}
  </div>;
}
