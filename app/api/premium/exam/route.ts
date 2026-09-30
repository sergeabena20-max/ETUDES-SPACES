import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Épreuve manquante." }, { status: 400 });
  const exam = await prisma.exam.findFirst({
    where: { id, status: "PUBLISHED", isPremium: true },
    select: { id: true, title: true, premiumPrice: true },
  });
  if (!exam || exam.premiumPrice === null) return NextResponse.json({ error: "Tarif indisponible." }, { status: 404 });
  return NextResponse.json({ ...exam, premiumPrice: exam.premiumPrice.toString() });
}
