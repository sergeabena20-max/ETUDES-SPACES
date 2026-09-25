import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canAccessQuiz } from "@/lib/quiz-access";

export default async function Dashboard() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const quizzes = await prisma.quiz.findMany({
    where: { status: "PUBLISHED" },
    include: {
      subject: true,
      academicLevel: true,
      program: true,
      questions: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const myQuizzes = quizzes.filter((q) => canAccessQuiz(user, q)).slice(0, 3);

  return (
    <main className="min-h-screen">
      <header className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="font-black">
            Études <span className="gradient-text">Space</span> 🇨🇲
          </Link>

          <form action="/api/auth/logout" method="post">
            <button className="text-sm font-semibold text-slate-600">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <section className="container py-10">
        <p className="text-sm font-semibold text-sky-600">Mon espace</p>
        <h1 className="mt-2 text-4xl font-black">
          Bonjour {user.firstName} 👋🏾
        </h1>
        <p className="mt-2 text-slate-500">
          Que veux-tu apprendre aujourd'hui ?
        </p>

        {myQuizzes.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-600">Pour toi</p>
                <h2 className="mt-1 text-2xl font-black">
                  Petits tests adaptés à ton profil
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Classe ou niveau :{" "}
                  {user.academicLevel?.name ?? "non renseigné"}
                  {user.program?.name ? ` · ${user.program.name}` : ""}
                </p>
              </div>

              <Link
                href="/quizzes"
                className="text-sm font-bold text-sky-600"
              >
                Voir tous →
              </Link>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {myQuizzes.map((q) => (
                <Link
                  key={q.id}
                  href={`/quizzes/${q.slug}`}
                  className="card p-5 transition hover:-translate-y-1"
                >
                  <span className="text-2xl">🧠</span>
                  <h3 className="mt-3 font-bold">{q.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {q.questions.length} questions ·{" "}
                    {q.subject?.name ?? "Matière"}
                  </p>
                  <span className="mt-4 inline-block text-sm font-bold text-sky-600">
                    Commencer →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/courses"
            className="card p-6 transition hover:-translate-y-1"
          >
            <span className="text-3xl">📚</span>
            <h2 className="mt-4 font-bold">Cours</h2>
            <p className="mt-1 text-sm text-slate-500">
              Apprendre par matière.
            </p>
          </Link>

          <Link
            href="/exams"
            className="card p-6 transition hover:-translate-y-1"
          >
            <span className="text-3xl">📝</span>
            <h2 className="mt-4 font-bold">Épreuves</h2>
            <p className="mt-1 text-sm text-slate-500">
              S'entraîner avec des sujets.
            </p>
          </Link>

          <Link
            href="/favorites"
            className="card p-6 transition hover:-translate-y-1"
          >
            <span className="text-3xl">❤️</span>
            <h2 className="mt-4 font-bold">Mes favoris</h2>
            <p className="mt-1 text-sm text-slate-500">
              Retrouver mes contenus.
            </p>
          </Link>

          <Link
            href="/profile"
            className="card p-6 transition hover:-translate-y-1"
          >
            <span className="text-3xl">👤</span>
            <h2 className="mt-4 font-bold">Mon profil</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mes informations.
            </p>
          </Link>

          {(user.type === "ADMIN" || user.type === "SUPER_ADMIN") && (
            <Link
              href="/admin"
              className="card border-sky-200 bg-sky-50 p-6 transition hover:-translate-y-1"
            >
              <span className="text-3xl">⚙️</span>
              <h2 className="mt-4 font-bold">Administration</h2>
              <p className="mt-1 text-sm text-slate-500">
                Gérer la plateforme.
              </p>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
