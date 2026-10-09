import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Renseigne une adresse e-mail valide." }, { status: 400 });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      const pending = await prisma.passwordResetRequest.findFirst({ where: { userId: user.id, status: "PENDING" }, select: { id: true } });
      if (!pending) await prisma.passwordResetRequest.create({ data: { userId: user.id } });
    }
    return NextResponse.json({ ok: true, message: "Si le compte existe, ta demande a été transmise à l’administration. Tu pourras changer ton mot de passe après validation." });
  } catch (error) {
    console.error("password_reset_request_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Impossible d’envoyer la demande pour le moment." }, { status: 500 });
  }
}
