import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const schema = z.object({
  entity: z.enum(["city","school","level","program","subject"]),
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().max(80).optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  kind: z.string().trim().max(80).optional().nullable(),
});

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const [cities, schools, levels, programs, subjects] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { schools: true } } } }),
    prisma.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, type: true, cityId: true, city: { select: { name: true } }, _count: { select: { users: true, courses: true, exams: true } } } }),
    prisma.academicLevel.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { users: true, courses: true, exams: true } } } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, kind: true, _count: { select: { users: true, courses: true, exams: true } } } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, _count: { select: { courses: true, exams: true } } } }),
  ]);
  return NextResponse.json({ cities, schools, levels, programs, subjects });
}

export async function POST(req: Request) { return save(req, false); }
export async function PUT(req: Request) { return save(req, true); }

async function save(req: Request, editing: boolean) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  const { entity, id, name, type, cityId, kind } = parsed.data;
  if (editing && !id) return NextResponse.json({ error: "Élément introuvable." }, { status: 400 });

  try {
    let entityId = id ?? "";
    if (entity === "city") {
      const item = editing ? await prisma.city.update({ where: { id: id! }, data: { name }, select: { id: true } }) : await prisma.city.create({ data: { name }, select: { id: true } });
      entityId = item.id;
    } else if (entity === "school") {
      if (cityId) {
        const city = await prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
        if (!city) return NextResponse.json({ error: "Ville invalide." }, { status: 400 });
      }
      const item = editing
        ? await prisma.school.update({ where: { id: id! }, data: { name, type: type || null, cityId: cityId || null }, select: { id: true } })
        : await prisma.school.create({ data: { name, type: type || null, cityId: cityId || null }, select: { id: true } });
      entityId = item.id;
    } else if (entity === "level") {
      const item = editing ? await prisma.academicLevel.update({ where: { id: id! }, data: { name }, select: { id: true } }) : await prisma.academicLevel.create({ data: { name }, select: { id: true } });
      entityId = item.id;
    } else if (entity === "program") {
      const item = editing ? await prisma.program.update({ where: { id: id! }, data: { name, kind: kind || null }, select: { id: true } }) : await prisma.program.create({ data: { name, kind: kind || null }, select: { id: true } });
      entityId = item.id;
    } else {
      const item = editing ? await prisma.subject.update({ where: { id: id! }, data: { name }, select: { id: true } }) : await prisma.subject.create({ data: { name }, select: { id: true } });
      entityId = item.id;
    }
    await prisma.auditLog.create({ data: { actorId: admin.id, action: editing ? "ACADEMIC_UPDATED" : "ACADEMIC_CREATED", entity: entity.toUpperCase(), entityId, metadata: { name } } });
    return NextResponse.json({ ok: true, id: entityId });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2002") return NextResponse.json({ error: "Cet élément existe déjà." }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible d'enregistrer cet élément." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await req.json();
  if (!["city","school","level","program","subject"].includes(body.entity) || typeof body.id !== "string") return NextResponse.json({ error: "Élément invalide." }, { status: 400 });
  const { entity, id } = body;
  try {
    if (entity === "city") await prisma.city.delete({ where: { id } });
    else if (entity === "school") await prisma.school.delete({ where: { id } });
    else if (entity === "level") await prisma.academicLevel.delete({ where: { id } });
    else if (entity === "program") await prisma.program.delete({ where: { id } });
    else await prisma.subject.delete({ where: { id } });
    await prisma.auditLog.create({ data: { actorId: admin.id, action: "ACADEMIC_DELETED", entity: entity.toUpperCase(), entityId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "P2003") return NextResponse.json({ error: "Cet élément est utilisé par des données existantes et ne peut pas être supprimé." }, { status: 409 });
    if (code === "P2025") return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible de supprimer cet élément." }, { status: 500 });
  }
}
