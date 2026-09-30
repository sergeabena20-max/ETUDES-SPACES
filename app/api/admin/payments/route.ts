import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
});

export async function GET() {
  const admin = await requireAdmin("payments.read");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      exam: { select: { id: true, title: true, premiumPrice: true } },
    },
  });

  return NextResponse.json({ payments });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin("payments.update");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: parsed.data.id },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!payment) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  if (payment.status !== "pending") {
    return NextResponse.json({ error: "Ce paiement a déjà été traité." }, { status: 409 });
  }

  if (parsed.data.action === "reject") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "rejected" },
    });
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "PREMIUM_PAYMENT_REJECTED",
        entity: "PAYMENT",
        entityId: payment.id,
        metadata: { userId: payment.userId, reference: payment.externalId },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (payment.targetType === "EXAM") {
    if (!payment.examId || !payment.exam || payment.exam.premiumPrice === null) {
      return NextResponse.json({ error: "Épreuve Premium introuvable ou tarif non configuré." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "approved" } });
      await tx.examPurchase.upsert({
        where: { userId_examId: { userId: payment.userId, examId: payment.examId! } },
        create: { userId: payment.userId, examId: payment.examId!, paymentId: payment.id },
        update: { paymentId: payment.id, purchasedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "PREMIUM_EXAM_ACTIVATED",
          entity: "EXAM_PURCHASE",
          entityId: payment.examId,
          metadata: { paymentId: payment.id, userId: payment.userId, amount: payment.amount.toString(), reference: payment.externalId },
        },
      });
    });
  } else {
    const plan = await prisma.plan.findUnique({ where: { code: "PREMIUM" } });
    const settings = await prisma.premiumSettings.findUnique({ where: { id: "main" } });
    if (!plan || !plan.active || !settings?.enabled) {
      return NextResponse.json({ error: "Le Premium global est indisponible." }, { status: 400 });
    }
    const endsAt = new Date(Date.now() + settings.durationDays * 86400000);
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "approved" } });
      await tx.subscription.updateMany({
        where: { userId: payment.userId, planId: plan.id, status: "active" },
        data: { status: "inactive", updatedAt: new Date() },
      });
      await tx.subscription.create({
        data: {
          userId: payment.userId, planId: plan.id, status: "active",
          provider: payment.provider, externalId: payment.externalId,
          startsAt: new Date(), endsAt,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: admin.id, action: "PREMIUM_ACTIVATED", entity: "SUBSCRIPTION", entityId: payment.userId,
          metadata: { paymentId: payment.id, amount: payment.amount.toString(), durationDays: settings.durationDays, provider: payment.provider, reference: payment.externalId },
        },
      });
    });
  }

  return NextResponse.json({ ok: true });
}
