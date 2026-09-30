import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  provider: z.enum(["ORANGE_MONEY", "MTN_MOMO"]),
  amount: z.coerce.number().int().positive().max(100000000),
  reference: z.string().trim().min(3).max(120),
  details: z.string().trim().max(1000).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour demander Premium." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  const existing = await prisma.payment.findFirst({
    where: { userId: user.id, status: "pending" },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Une demande de paiement est déjà en attente de vérification." }, { status: 409 });
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount: parsed.data.amount,
      currency: "XAF",
      provider: parsed.data.provider,
      status: "pending",
      externalId: parsed.data.reference,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PREMIUM_PAYMENT_SUBMITTED",
      entity: "PAYMENT",
      entityId: payment.id,
      metadata: {
        provider: parsed.data.provider,
        amount: parsed.data.amount,
        reference: parsed.data.reference,
        details: parsed.data.details || null,
      },
    },
  });

  return NextResponse.json({ ok: true, paymentId: payment.id });
}
