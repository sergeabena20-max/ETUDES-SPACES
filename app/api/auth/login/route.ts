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
    try {
      await createSession(user.id);
    } catch (sessionError) {
      const code = sessionError && typeof sessionError === "object" && "code" in sessionError
        ? String(sessionError.code)
        : "";
      if (code === "P2002" || code === "P2034") {
        return NextResponse.json({
          error: "Ce compte est déjà connecté sur un autre appareil ou navigateur. Déconnecte-toi d'abord de cette session avant de te reconnecter ici.",
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