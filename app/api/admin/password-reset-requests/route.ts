import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authorization";

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const requests = await prisma.passwordResetRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { requestedAt: "asc" },
    select: {
      id: true, requestedAt: true, userId: true,
      user: { select: { firstName: true, lastName: true, email: true, studentStatus: true } },
    },
  });
  return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !["APPROVE", "REJECT"].includes(body.action)) {
    return NextResponse.json({ error: "Demande ou action invalide." }, { status: 400 });
  }
  const resetRequest = await prisma.passwordResetRequest.findUnique({
    where: { id: body.id }, select: { id: true, userId: true, status: true },
  });
  if (!resetRequest || resetRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée ou n’existe pas." }, { status: 404 });
  }
  const approved = body.action === "APPROVE";
  await prisma.$transaction([
    prisma.passwordResetRequest.update({
      where: { id: resetRequest.id },
      data: { status: approved ? "APPROVED" : "REJECTED", reviewedAt: new Date(), reviewedBy: admin.id },
    }),
    ...(approved ? [
      prisma.user.update({ where: { id: resetRequest.userId }, data: { mustChangePassword: true } }),
      prisma.session.deleteMany({ where: { userId: resetRequest.userId } }),
    ] : []),
    prisma.auditLog.create({
      data: { actorId: admin.id, action: approved ? "PASSWORD_RESET_APPROVED" : "PASSWORD_RESET_REJECTED", entity: "User", entityId: resetRequest.userId },
    }),
  ]);
  return NextResponse.json({ ok: true, message: approved ? "Demande approuvée. L’utilisateur devra choisir un nouveau mot de passe à sa prochaine connexion." : "Demande refusée." });
}
