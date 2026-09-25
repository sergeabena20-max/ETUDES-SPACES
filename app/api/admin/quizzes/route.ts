import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  question: z.string().trim().min(3).max(2000),
  optionA: z.string().trim().min(1).max(500),
  optionB: z.string().trim().min(1).max(500),
  optionC: z.string().trim().min(1).max(500),
  optionD: z.string().trim().min(1).max(500),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().trim().max(2000).optional().nullable(),
  order: z.number().int().min(0).max(500),
});

const schema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  subjectId: z.string().uuid().optional().nullable(),
  academicLevelId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  questions: z.array(questionSchema).max(100),
});

const options = {
  subject: { select: { id: true, name: true } },
  academicLevel: { select: { id: true, name: true } },
  program: { select: { id: true, name: true } },
  questions: { orderBy: { order: "asc" as const } },
};

export async function GET() {
  const admin = await requireAdmin("quizzes.read");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [quizzes, subjects, levels, programs] = await Promise.all([
    prisma.quiz.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: options }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return NextResponse.json({ quizzes, subjects, levels, programs });
}

export async function POST(req: Request) { return save(req, false); }
export async function PUT(req: Request) { return save(req, true); }

async function save(req: Request, editing: boolean) {
  const admin = await requireAdmin(editing ? "quizzes.update" : "quizzes.create");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });

  const data = parsed.data;
  if (editing && !data.id) return NextResponse.json({ error: "Quiz introuvable." }, { status: 400 });
  if (data.status === "PUBLISHED" && data.questions.length === 0) {
    return NextResponse.json({ error: "Un quiz publié doit contenir au moins une question." }, { status: 400 });
  }

  try {
    const quiz = await prisma.$transaction(async (tx) => {
      const saved = editing
        ? await tx.quiz.update({
            where: { id: data.id! },
            data: {
              title: data.title, slug: data.slug, description: data.description || null,
              status: data.status, subjectId: data.subjectId || null,
              academicLevelId: data.academicLevelId || null, programId: data.programId || null,
            },
            select: { id: true },
          })
        : await tx.quiz.create({
            data: {
              title: data.title, slug: data.slug, description: data.description || null,
              status: data.status, subjectId: data.subjectId || null,
              academicLevelId: data.academicLevelId || null, programId: data.programId || null,
            },
            select: { id: true },
          });

      await tx.quizQuestion.deleteMany({ where: { quizId: saved.id } });
      if (data.questions.length) {
        await tx.quizQuestion.createMany({
          data: data.questions.map((q, index) => ({
            quizId: saved.id, question: q.question, optionA: q.optionA, optionB: q.optionB,
            optionC: q.optionC, optionD: q.optionD, correctOption: q.correctOption,
            explanation: q.explanation || null, order: index,
          })),
        });
      }
      return saved;
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id, action: editing ? "QUIZ_UPDATED" : "QUIZ_CREATED",
        entity: "QUIZ", entityId: quiz.id,
        metadata: { title: data.title, status: data.status, questionCount: data.questions.length },
      },
    });
    return NextResponse.json({ ok: true, id: quiz.id });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2002") return NextResponse.json({ error: "Ce slug existe déjà." }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ error: "Quiz introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible d'enregistrer le quiz." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin("quizzes.delete");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Quiz invalide." }, { status: 400 });
  try {
    await prisma.quiz.delete({ where: { id: body.id } });
    await prisma.auditLog.create({ data: { actorId: admin.id, action: "QUIZ_DELETED", entity: "QUIZ", entityId: body.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2025") return NextResponse.json({ error: "Quiz introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible de supprimer le quiz." }, { status: 500 });
  }
}
