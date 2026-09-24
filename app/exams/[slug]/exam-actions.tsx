"use client";

import { useState } from "react";

type CommentItem = {
  id: string;
  content: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
};

export default function ExamActions({
  examId,
  initialFavorite,
  initialComments,
  isAuthenticated,
  currentUserId,
}: {
  examId: string;
  initialFavorite: boolean;
  initialComments: CommentItem[];
  isAuthenticated: boolean;
  currentUserId: string | null;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleFavorite() {
    if (!isAuthenticated) {
      window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname);
      return;
    }
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/favorites", {
      method: favorite ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Impossible de modifier le favori.");
      return;
    }
    setFavorite(!favorite);
  }

  async function addComment() {
    if (!isAuthenticated) {
      window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname);
      return;
    }
    if (content.trim().length < 2) {
      setMessage("Écris au moins quelques mots.");
      return;
    }

    setBusy(true);
    setMessage("");
    const res = await fetch("/api/exams/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, content }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Impossible de publier le commentaire.");
      return;
    }
    setComments((current) => [data.comment, ...current]);
    setContent("");
  }

  async function deleteComment(id: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    const res = await fetch("/api/exams/comments?id=" + encodeURIComponent(id), { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Suppression impossible.");
      return;
    }
    setComments((current) => current.filter((comment) => comment.id !== id));
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={toggleFavorite}
          disabled={busy}
          className={"rounded-xl px-5 py-3 font-bold transition " + (favorite ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200" : "bg-slate-100 text-slate-700")}
        >
          {favorite ? "♥ Dans mes favoris" : "♡ Ajouter aux favoris"}
        </button>
        {!isAuthenticated && <span className="text-xs text-slate-500">Connexion nécessaire pour enregistrer un favori.</span>}
      </div>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Discussion</h2>
            <p className="mt-1 text-sm text-slate-500">Pose une question ou partage une remarque sur cette épreuve.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{comments.length} commentaire{comments.length > 1 ? "s" : ""}</span>
        </div>

        {isAuthenticated ? (
          <div className="mt-5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              placeholder="Ton commentaire..."
              className="min-h-28 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">{content.length}/2000</span>
              <button onClick={addComment} disabled={busy} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                Publier
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            Connecte-toi pour participer à la discussion.
          </p>
        )}

        {message && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p>}

        <div className="mt-6 space-y-4">
          {comments.length ? comments.map((comment) => {
            const name = (comment.user.firstName + " " + comment.user.lastName).trim();
            const mine = currentUserId && comment.userId === currentUserId;
            return (
              <article key={comment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-sm">{name}</div>
                  {mine && <button onClick={() => deleteComment(comment.id)} className="text-xs font-semibold text-red-600">Supprimer</button>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</p>
                <time className="mt-2 block text-xs text-slate-400">{new Date(comment.createdAt).toLocaleDateString("fr-FR")}</time>
              </article>
            );
          }) : <p className="mt-6 text-sm text-slate-500">Aucun commentaire pour le moment. Sois le premier à réagir.</p>}
        </div>
      </section>
    </>
  );
}
