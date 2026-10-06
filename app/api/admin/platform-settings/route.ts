import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const schema = z.object({
  id: z.string().min(1).max(100).optional(),
  key: z.string().trim().min(2).max(100).regex(/^[A-Z0-9_]+$/),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().min(2).max(50),
  type: z.enum(["STRING", "NUMBER", "BOOLEAN"]),
  value: z.string().max(2000),
  enabled: z.boolean(),
});

function validValue(type: string, value: string) {
  if (type === "NUMBER") return Number.isFinite(Number(value));
  if (type === "BOOLEAN") return value === "true" || value === "false";
  return true;
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const settings = await prisma.platformSetting.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] });
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  return save(request, false);
}

export async function PUT(request: Request) {
  return save(request, true);
}

async function save(request: Request, editing: boolean) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });
  const data = parsed.data;
  if (editing && !data.id) return NextResponse.json({ error: "Réglage introuvable." }, { status: 400 });
  if (!validValue(data.type, data.value)) return NextResponse.json({ error: "La valeur ne correspond pas au type choisi." }, { status: 400 });

  const duplicate = await prisma.platformSetting.findFirst({
    where: { key: data.key, ...(data.id ? { NOT: { id: data.id } } : {}) },
    select: { id: true },
  });
  if (duplicate) return NextResponse.json({ error: "Cette clé de configuration existe déjà." }, { status: 409 });

  try {
    const setting = editing
      ? await prisma.platformSetting.update({
          where: { id: data.id! },
          data: { key: data.key, label: data.label, description: data.description || null, category: data.category, type: data.type, value: data.value, enabled: data.enabled },
        })
      : await prisma.platformSetting.create({
          data: { key: data.key, label: data.label, description: data.description || null, category: data.category, type: data.type, value: data.value, enabled: data.enabled },
        });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: editing ? "PLATFORM_SETTING_UPDATED" : "PLATFORM_SETTING_CREATED",
        entity: "PLATFORM_SETTING",
        entityId: setting.id,
        metadata: { key: setting.key, value: setting.value, enabled: setting.enabled },
      },
    });
    return NextResponse.json({ ok: true, setting });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2025") return NextResponse.json({ error: "Réglage introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible d'enregistrer le réglage." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Réglage invalide." }, { status: 400 });

  const setting = await prisma.platformSetting.findUnique({ where: { id: body.id }, select: { id: true, key: true } });
  if (!setting) return NextResponse.json({ error: "Réglage introuvable." }, { status: 404 });

  await prisma.platformSetting.delete({ where: { id: setting.id } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "PLATFORM_SETTING_DELETED", entity: "PLATFORM_SETTING", entityId: setting.id, metadata: { key: setting.key } } });
  return NextResponse.json({ ok: true });
}
