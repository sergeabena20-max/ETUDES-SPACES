import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const KEY = "PWA_INSTALL_PROMPT_ENABLED";

export async function GET() {
  try {
    const setting = await prisma.platformSetting.findUnique({ where: { key: KEY }, select: { value: true, enabled: true } });
    return NextResponse.json({ enabled: setting?.enabled !== false && setting?.value === "true" });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function PUT(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Action réservée au Super Administrateur." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") return NextResponse.json({ error: "Valeur invalide." }, { status: 400 });
  const value = String(body.enabled);
  const setting = await prisma.platformSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, label: "Bannière d’installation de l’application", description: "Affiche ou masque la demande d’installation pour tous les utilisateurs.", category: "INTERFACE", type: "BOOLEAN", value, enabled: true },
    update: { value, enabled: true, label: "Bannière d’installation de l’application", description: "Affiche ou masque la demande d’installation pour tous les utilisateurs.", category: "INTERFACE", type: "BOOLEAN" },
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "PWA_INSTALL_PROMPT_TOGGLED", entity: "PLATFORM_SETTING", entityId: setting.id, metadata: { enabled: body.enabled } } });
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
