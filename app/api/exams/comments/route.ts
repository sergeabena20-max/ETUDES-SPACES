import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const commentSchema = z.object({
  examId: z.string().min(1),
  content: z.string().trim().min(2, "Le commentaire est trop court.").max(2000, "Le commentaire est trop long."),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const examId = url.searchParams.get("examId");
  if (!examId) return NextResponse.json({ error: "Épreuve manquante." }, { status: 400 });

  const comments = await prisma.comment.findMany({
    where: { examId },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour commenter." }, { status: 401 });

  const parsed = commentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Commentaire invalide." }, { status: 400 });

  const exam = await prisma.exam.findFirst({
    where: { id: parsed.data.examId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!exam) return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });

  const comment = await prisma.comment.create({
    data: { examId: exam.id, userId: user.id, content: parsed.data.content },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Commentaire manquant." }, { status: 400 });

  const comment = await prisma.comment.findUnique({ where: { id }, select: { userId: true } });
  if (!comment) return NextResponse.json({ error: "Commentaire introuvable." }, { status: 404 });
  if (comment.userId !== user.id && user.type !== "ADMIN" && user.type !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
