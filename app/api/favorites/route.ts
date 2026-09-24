import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const favoriteSchema = z.object({
  examId: z.string().optional(),
  courseId: z.string().optional(),
}).refine((v) => Boolean(v.examId) !== Boolean(v.courseId), {
  message: "Choisis une épreuve ou un cours.",
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      exam: { select: { id: true, title: true, slug: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ favorites });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour ajouter un favori." }, { status: 401 });

  const parsed = favoriteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Données de favori invalides." }, { status: 400 });

  const { examId, courseId } = parsed.data;

  if (examId) {
    const exam = await prisma.exam.findFirst({ where: { id: examId, status: "PUBLISHED" }, select: { id: true } });
    if (!exam) return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });
  } else if (courseId) {
    const course = await prisma.course.findFirst({ where: { id: courseId, status: "PUBLISHED" }, select: { id: true } });
    if (!course) return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
  }

  const existing = await prisma.favorite.findFirst({ where: { userId: user.id, examId: examId ?? null, courseId: courseId ?? null } });
  if (existing) return NextResponse.json({ favorite: existing, alreadyExists: true });

  const favorite = await prisma.favorite.create({
    data: { userId: user.id, examId: examId ?? null, courseId: courseId ?? null },
  });

  return NextResponse.json({ favorite }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = favoriteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Données de favori invalides." }, { status: 400 });

  const favorite = await prisma.favorite.findFirst({
    where: { userId: user.id, examId: parsed.data.examId ?? null, courseId: parsed.data.courseId ?? null },
    select: { id: true },
  });

  if (!favorite) return NextResponse.json({ deleted: false });

  await prisma.favorite.delete({ where: { id: favorite.id } });
  return NextResponse.json({ deleted: true });
}
