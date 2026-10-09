import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const genericResponse = {
  ok: true,
  message: "Si cette adresse correspond à un compte, un e-mail de réinitialisation sera envoyé.",
};

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "La récupération par e-mail n’est pas encore configurée. Contacte l’administration." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Renseigne une adresse e-mail valide." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return NextResponse.json(genericResponse);

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const resetUrl = origin + "/reset-password?token=" + encodeURIComponent(rawToken);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: "Réinitialisation de ton mot de passe — Études Space",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a"><h2 style="color:#0284c7">Études Space 🇨🇲</h2><p>Tu as demandé à réinitialiser le mot de passe de ton compte.</p><p>Ce lien est valable pendant 30 minutes et ne peut être utilisé qu’une seule fois.</p><p style="margin:28px 0"><a href="${resetUrl}" style="background:#0284c7;color:white;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Choisir un nouveau mot de passe</a></p><p>Si tu n’as pas demandé cette réinitialisation, ignore ce message. Ton mot de passe ne changera pas.</p></div>`,
      }),
    });

    if (!emailResponse.ok) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      console.error("password_reset_email_error", emailResponse.status);
      return NextResponse.json({ error: "L’e-mail n’a pas pu être envoyé. Réessaie plus tard." }, { status: 503 });
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("forgot_password_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Impossible de traiter la demande pour le moment." }, { status: 500 });
  }
}
