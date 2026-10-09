import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  token: z.string().min(32).max(200),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });
  }

  try {
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const reset = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!reset || reset.expiresAt <= new Date()) {
      if (reset) await prisma.passwordResetToken.delete({ where: { id: reset.id } });
      return NextResponse.json({ error: "Ce lien est invalide ou expiré. Demande un nouveau lien." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: reset.userId } }),
      prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);

    return NextResponse.json({ ok: true, message: "Mot de passe modifié. Tu peux maintenant te connecter." });
  } catch (error) {
    console.error("reset_password_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Impossible de modifier le mot de passe pour le moment." }, { status: 500 });
  }
}
