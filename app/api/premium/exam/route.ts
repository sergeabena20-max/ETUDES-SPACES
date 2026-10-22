import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { examMatchesUserProfile, getCrossProfileExamPrice } from "@/lib/cross-profile-exam";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Épreuve manquante." }, { status: 400 });
  const exam = await prisma.exam.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { id: true, title: true, premiumPrice: true, isPremium: true, academicLevelId: true, programId: true },
  });
  if (!exam) return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour acheter une épreuve." }, { status: 401 });
  const isAdmin = user.type === "ADMIN" || user.type === "SUPER_ADMIN";
  const crossProfilePrice = await getCrossProfileExamPrice();
  const crossProfile = !isAdmin && crossProfilePrice !== null && !examMatchesUserProfile(user, exam);
  const price = crossProfile ? crossProfilePrice : exam.premiumPrice === null ? null : Number(exam.premiumPrice);
  if (price === null || (!exam.isPremium && !crossProfile)) return NextResponse.json({ error: "Cette épreuve ne nécessite pas d'achat ou son tarif est indisponible." }, { status: 404 });
  return NextResponse.json({ id: exam.id, title: exam.title, premiumPrice: String(price) });
}
