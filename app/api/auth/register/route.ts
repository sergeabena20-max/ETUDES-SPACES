import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const v = parsed.data;

    // Run independent lookups together to reduce database round trips.
    const [existing, school, program] = await Promise.all([
      prisma.user.findUnique({ where: { email: v.email }, select: { id: true } }),
      prisma.school.findFirst({ where: { name: v.schoolName }, select: { id: true } }),
      v.studentStatus === "ETUDIANT" && v.programName
        ? prisma.program.findUnique({ where: { name: v.programName }, select: { id: true } })
        : Promise.resolve(null),
    ]);

    if (existing) {
      return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée." }, { status: 409 });
    }

    if (v.studentStatus === "ETUDIANT" && !program) {
      return NextResponse.json({ error: "Cette filière n'est pas encore disponible." }, { status: 400 });
    }

    // Password hashing is CPU-intensive; run it alongside the academic-level lookup.
    const [academicLevel, passwordHash] = await Promise.all([
      prisma.academicLevel.findFirst({
        where: {
          name: v.academicLevelName,
          kind: v.studentStatus === "ELEVE" ? "SCOLAIRE" : "UNIVERSITAIRE",
          ...(program ? { programLevels: { some: { programId: program.id } } } : {}),
        },
        select: { id: true },
      }),
      hashPassword(v.password),
    ]);

    if (!academicLevel) {
      return NextResponse.json({ error: "Cette classe ou ce niveau n'est pas encore disponible." }, { status: 400 });
    }

    // Keep school creation explicit; user creation must wait for its foreign key.
    const resolvedSchool = school ?? await prisma.school.create({
      data: { name: v.schoolName },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        passwordHash,
        studentStatus: v.studentStatus,
        schoolId: resolvedSchool.id,
        academicLevelId: academicLevel.id,
        programId: program?.id ?? null,
      },
      select: { id: true },
    });

    // Analytics must not delay a successful registration response.
    void prisma.analyticsEvent.create({
      data: { type: "USER_REGISTERED", userId: user.id },
    }).catch((error) => {
      console.error("register_analytics_error", error instanceof Error ? error.message : "unknown");
    });

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("register_error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Une erreur est survenue. Réessaie." }, { status: 500 });
  }
}
