import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

const schema = z.object({
  enabled: z.boolean(),
  type: z.enum(["INFO", "WARNING", "MAINTENANCE", "SUCCESS"]),
  audience: z.enum(["BEFORE_LOGIN", "AFTER_LOGIN", "BOTH"]),
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(1000),
});

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const notice = await prisma.siteNotice.findUnique({ where: { id: "main" } });
  return NextResponse.json({ notice });
}

export async function PUT(req: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
  }

  const notice = await prisma.siteNotice.upsert({
    where: { id: "main" },
    create: { id: "main", ...parsed.data },
    update: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SITE_NOTICE_UPDATED",
      entity: "SITE_NOTICE",
      entityId: notice.id,
      metadata: { enabled: notice.enabled, type: notice.type, audience: notice.audience, title: notice.title },
    },
  });

  return NextResponse.json({ ok: true, notice });
}
