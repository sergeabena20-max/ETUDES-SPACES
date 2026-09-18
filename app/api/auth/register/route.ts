import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });

    const v = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: v.email } });
    if (existing) return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée." }, { status: 409 });

    const school = await prisma.school.findFirst({ where: { name: v.schoolName } });
    const academicLevel = await prisma.academicLevel.findUnique({ where: { name: v.academicLevelName } });
    const program = await prisma.program.findUnique({ where: { name: v.programName } });

    const user = await prisma.user.create({
      data: {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        passwordHash: await hashPassword(v.password),
        studentStatus: v.studentStatus,
        schoolId: school?.id ?? (await prisma.school.create({ data: { name: v.schoolName } })).id,
        academicLevelId: academicLevel?.id ?? (await prisma.academicLevel.create({ data: { name: v.academicLevelName } })).id,
        programId: program?.id ?? (await prisma.program.create({ data: { name: v.programName, kind: v.studentStatus === "ELEVE" ? "SERIE" : "FILIERE" } })).id,
      },
    });

    await prisma.analyticsEvent.create({ data: { type: "USER_REGISTERED", userId: user.id } });
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("register_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie." }, { status: 500 });
  }
}
