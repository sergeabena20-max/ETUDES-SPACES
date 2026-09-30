import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const schema = z.object({
  enabled: z.boolean(),
  premiumPrice: z.coerce.number().min(0).max(100000000),
  durationDays: z.coerce.number().int().min(1).max(3650),
  orangeMoneyNumber: z.string().trim().min(6).max(30),
  orangeMoneyName: z.string().trim().min(2).max(120),
  mtnMomoNumber: z.string().trim().min(6).max(30),
  mtnMomoName: z.string().trim().min(2).max(120),
  whatsappNumber: z.string().trim().min(6).max(30),
  paymentInstructions: z.string().trim().min(1).max(1000),
});

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const settings = await prisma.premiumSettings.findUnique({ where: { id: "main" } });
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });

  const settings = await prisma.premiumSettings.upsert({
    where: { id: "main" },
    create: { id: "main", ...parsed.data },
    update: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "PREMIUM_SETTINGS_UPDATED",
      entity: "PREMIUM_SETTINGS",
      entityId: "main",
      metadata: { premiumPrice: settings.premiumPrice.toString(), durationDays: settings.durationDays, enabled: settings.enabled },
    },
  });

  return NextResponse.json({ ok: true, settings });
}
