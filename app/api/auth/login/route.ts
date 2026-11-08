import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Adresse e-mail ou mot de passe invalide." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Adresse e-mail ou mot de passe incorrect." }, { status: 401 });
    }
    try {
      await createSession(user.id, body?.takeOverSession === true);
    } catch (sessionError) {
      const code = sessionError && typeof sessionError === "object" && "code" in sessionError
        ? String(sessionError.code)
        : "";
      if (code === "P2002" || code === "P2034") {
        return NextResponse.json({
          error: "Ce compte est déjà connecté sur un autre appareil ou navigateur.",
          code: "SESSION_ALREADY_ACTIVE",
        }, { status: 409 });
      }
      throw sessionError;
    }
    void prisma.analyticsEvent.create({ data: { type: "USER_LOGIN", userId: user.id } }).catch((error) => {
      console.error("login_analytics_error", error instanceof Error ? error.message : "unknown");
    });
    return NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword, userType: user.type });
  } catch (error) {
    console.error("login_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie." }, { status: 500 });
  }
}