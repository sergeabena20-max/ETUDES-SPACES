import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

const schema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(2000).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  fileUrl: z.string().trim().url().optional().nullable(),
  status: z.enum(["DRAFT","PUBLISHED","ARCHIVED"]),
  isPremium: z.boolean(),
  subjectId: z.string().uuid().optional().nullable(),
  academicLevelId: z.string().uuid().optional().nullable(),
  schoolId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  solutionText: z.string().trim().max(20000).optional().nullable(),
  solutionFileUrl: z.string().trim().url().optional().nullable(),
});

export async function GET() {
  const admin = await requireAdmin("exams.read");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const [exams, subjects, levels, schools, programs] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        subject: { select: { name: true } },
        academicLevel: { select: { name: true } },
        school: { select: { name: true } },
        program: { select: { name: true } },
        solution: { select: { text: true, fileUrl: true } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return NextResponse.json({ exams, subjects, levels, schools, programs });
}

export async function POST(req: Request) {
  return save(req, false);
}

export async function PUT(req: Request) {
  return save(req, true);
}

async function save(req: Request, editing: boolean) {
  const admin = await requireAdmin(editing ? "exams.update" : "exams.create");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  const data = parsed.data;
  if (editing && !data.id) return NextResponse.json({ error: "Épreuve introuvable." }, { status: 400 });

  try {
    const examData = {
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      year: data.year ?? null,
      category: data.category || null,
      fileUrl: data.fileUrl || null,
      status: data.status,
      isPremium: data.isPremium,
      subjectId: data.subjectId || null,
      academicLevelId: data.academicLevelId || null,
      schoolId: data.schoolId || null,
      programId: data.programId || null,
    };

    const exam = editing
      ? await prisma.exam.update({ where: { id: data.id! }, data: examData, select: { id: true } })
      : await prisma.exam.create({ data: examData, select: { id: true } });

    const hasSolution = Boolean(data.solutionText || data.solutionFileUrl);
    if (hasSolution) {
      await prisma.examSolution.upsert({
        where: { examId: exam.id },
        create: {
          examId: exam.id,
          text: data.solutionText || null,
          fileUrl: data.solutionFileUrl || null,
        },
        update: {
          text: data.solutionText || null,
          fileUrl: data.solutionFileUrl || null,
        },
      });
    } else if (editing) {
      await prisma.examSolution.deleteMany({ where: { examId: exam.id } });
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: editing ? "EXAM_UPDATED" : "EXAM_CREATED",
        entity: "EXAM",
        entityId: exam.id,
        metadata: { title: data.title, status: data.status, year: data.year ?? null },
      },
    });

    return NextResponse.json({ ok: true, id: exam.id });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2002") return NextResponse.json({ error: "Ce slug existe déjà." }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible d'enregistrer l'épreuve." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin("exams.delete");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "Épreuve invalide." }, { status: 400 });
  }

  try {
    await prisma.exam.delete({ where: { id: body.id } });
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "EXAM_DELETED", entity: "EXAM", entityId: body.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2025") return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible de supprimer l'épreuve." }, { status: 500 });
  }
}
