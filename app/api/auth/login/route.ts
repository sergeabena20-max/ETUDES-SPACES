import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Adresse e-mail ou mot de passe invalide." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Adresse e-mail ou mot de passe incorrect." }, { status: 401 });
    }
    await prisma.analyticsEvent.create({ data: { type: "USER_LOGIN", userId: user.id } });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("login_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie." }, { status: 500 });
  }
}