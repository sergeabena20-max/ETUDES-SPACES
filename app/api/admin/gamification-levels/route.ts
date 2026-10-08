import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  minPoints: z.number().int().min(0).max(100000000),
  icon: z.string().trim().min(1).max(10),
  description: z.string().trim().max(300).optional().nullable(),
  active: z.boolean(),
  order: z.number().int().min(0).max(10000),
});

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  return NextResponse.json({ levels: await prisma.gamificationLevel.findMany({ orderBy: [{ order: "asc" }, { minPoints: "asc" }] }) });
}

export async function POST(request: Request) { return save(request, false); }
export async function PUT(request: Request) { return save(request, true); }

async function save(request: Request, editing: boolean) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });
  const data = parsed.data;
  if (editing && !data.id) return NextResponse.json({ error: "Niveau introuvable." }, { status: 400 });
  const duplicate = await prisma.gamificationLevel.findFirst({ where: { minPoints: data.minPoints, ...(data.id ? { NOT: { id: data.id } } : {}) }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "Ce seuil de points est déjà utilisé." }, { status: 409 });
  try {
    const level = editing
      ? await prisma.gamificationLevel.update({ where: { id: data.id! }, data: { name: data.name, minPoints: data.minPoints, icon: data.icon, description: data.description || null, active: data.active, order: data.order } })
      : await prisma.gamificationLevel.create({ data: { name: data.name, minPoints: data.minPoints, icon: data.icon, description: data.description || null, active: data.active, order: data.order } });
    await prisma.auditLog.create({ data: { actorId: admin.id, action: editing ? "GAMIFICATION_LEVEL_UPDATED" : "GAMIFICATION_LEVEL_CREATED", entity: "GAMIFICATION_LEVEL", entityId: level.id, metadata: { name: level.name, minPoints: level.minPoints, active: level.active } } });
    return NextResponse.json({ ok: true, level });
  } catch { return NextResponse.json({ error: "Impossible d'enregistrer le niveau." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès réservé au Super Admin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Niveau invalide." }, { status: 400 });
  const level = await prisma.gamificationLevel.findUnique({ where: { id: body.id }, select: { id: true, name: true } });
  if (!level) return NextResponse.json({ error: "Niveau introuvable." }, { status: 404 });
  await prisma.gamificationLevel.delete({ where: { id: level.id } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "GAMIFICATION_LEVEL_DELETED", entity: "GAMIFICATION_LEVEL", entityId: level.id, metadata: { name: level.name } } });
  return NextResponse.json({ ok: true });
}
