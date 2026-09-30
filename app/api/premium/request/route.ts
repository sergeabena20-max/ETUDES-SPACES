import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  targetType: z.enum(["PREMIUM_PLAN", "EXAM"]),
  examId: z.string().uuid().optional().nullable(),
  provider: z.enum(["ORANGE_MONEY", "MTN_MOMO"]),
  reference: z.string().trim().min(3).max(120),
  details: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour demander Premium." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });

  const settings = await prisma.premiumSettings.findUnique({ where: { id: "main" } });
  if (!settings?.enabled) return NextResponse.json({ error: "Les paiements Premium sont actuellement désactivés." }, { status: 400 });

  let requestedAmount = settings.premiumPrice;
  let durationDays: number | null = settings.durationDays;
  let examId: string | null = null;

  if (parsed.data.targetType === "EXAM") {
    if (!parsed.data.examId) return NextResponse.json({ error: "Épreuve Premium manquante." }, { status: 400 });
    const exam = await prisma.exam.findFirst({
      where: { id: parsed.data.examId, status: "PUBLISHED", isPremium: true },
      select: { id: true, premiumPrice: true },
    });
    if (!exam || exam.premiumPrice === null) return NextResponse.json({ error: "Cette épreuve n'est pas disponible à l'achat." }, { status: 400 });
    requestedAmount = exam.premiumPrice;
    durationDays = null;
    examId = exam.id;
  }

  if (requestedAmount.lessThanOrEqualTo(0)) {
    return NextResponse.json({ error: "Le tarif Premium n'a pas encore été configuré par l'administration." }, { status: 400 });
  }

  const existing = await prisma.payment.findFirst({
    where: { userId: user.id, status: "pending", targetType: parsed.data.targetType, examId },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ error: "Une demande de paiement similaire est déjà en attente." }, { status: 409 });

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount: requestedAmount,
      requestedAmount,
      currency: "XAF",
      provider: parsed.data.provider,
      status: "pending",
      externalId: parsed.data.reference,
      targetType: parsed.data.targetType,
      examId,
      durationDays,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PREMIUM_PAYMENT_SUBMITTED",
      entity: "PAYMENT",
      entityId: payment.id,
      metadata: {
        targetType: parsed.data.targetType,
        examId,
        amount: requestedAmount.toString(),
        reference: parsed.data.reference,
        details: parsed.data.details || null,
      },
    },
  });

  return NextResponse.json({ ok: true, paymentId: payment.id, amount: requestedAmount, currency: "XAF" });
}
