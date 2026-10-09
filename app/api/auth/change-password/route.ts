import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128),
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, {
  path: ["confirmPassword"], message: "Les mots de passe ne correspondent pas.",
});

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Connecte-toi pour continuer." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Données invalides." }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: current.id }, select: { id: true, mustChangePassword: true } });
  if (!user?.mustChangePassword) return NextResponse.json({ error: "Aucun changement de mot de passe n’est en attente." }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ ok: true, message: "Mot de passe modifié. Reconnecte-toi avec ton nouveau mot de passe." });
}
