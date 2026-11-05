import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { academicLevelLabelKey, formatAcademicLevelName } from "@/lib/academic-level-label";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const programId = params.get("programId");

  // Garantit que Tle TI apparaît à l'inscription même si le seed initial
  // n'a pas encore été exécuté sur la base de production.
  if (kind === "SCOLAIRE") {
    await prisma.academicLevel.upsert({
      where: { name: "Tle TI" },
      update: { kind: "SCOLAIRE" },
      create: { name: "Tle TI", kind: "SCOLAIRE" },
    });
  }
  const rawLevels = await prisma.academicLevel.findMany({
    where: {
      ...(kind === "SCOLAIRE" || kind === "UNIVERSITAIRE" ? { kind } : {}),
      ...(programId ? { programLevels: { some: { programId } } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true },
  });

  // Keep the exact database name as "name" for form submission; use "label"
  // only for display. The registration API looks up AcademicLevel.name exactly.
  const byLabel = new Map<string, typeof rawLevels[number]>();
  for (const level of rawLevels) {
    const key = academicLevelLabelKey(level.name);
    const current = byLabel.get(key);
    const candidateCanonical = level.name === formatAcademicLevelName(level.name);
    const currentCanonical = current ? current.name === formatAcademicLevelName(current.name) : false;
    if (!current || (candidateCanonical && !currentCanonical)) byLabel.set(key, level);
  }

  const classOrder = ["6e", "5e", "4e", "3e", "2nde A", "2nde C", "2nde D", "1ère A", "1ère C", "1ère D", "Tle A", "Tle C", "Tle D", "Tle TI"];
  const levels = Array.from(byLabel.values())
    .map((level) => ({ ...level, label: formatAcademicLevelName(level.name) }))
    .sort((a, b) => {
      const ai = classOrder.indexOf(a.label), bi = classOrder.indexOf(b.label);
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      return a.label.localeCompare(b.label, "fr");
    });

  return NextResponse.json({ levels });
}
