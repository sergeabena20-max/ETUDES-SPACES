import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(6).max(100),
});

export async function POST(request: Request) {
  const admin = await requireAdmin("exams.update");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Sélectionne au moins 6 épreuves valides, et au maximum 100." }, { status: 400 });
  }

  const ids = [...new Set(parsed.data.ids)];
  if (ids.length < 6) {
    return NextResponse.json({ error: "Sélectionne au moins 6 épreuves différentes." }, { status: 400 });
  }

  try {
    const existing = await prisma.exam.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (existing.length !== ids.length) {
      return NextResponse.json({ error: "Certaines épreuves n'existent plus. Actualise la page." }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.exam.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHED" } }),
      prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "EXAMS_BULK_PUBLISHED",
          entity: "EXAM",
          metadata: { ids, count: ids.length },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, count: ids.length });
  } catch (error) {
    console.error("bulk_publish_exams_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Impossible de publier ce lot." }, { status: 500 });
  }
}
