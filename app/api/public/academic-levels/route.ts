import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const programId = params.get("programId");

  const levels = await prisma.academicLevel.findMany({
    where: {
      ...(kind === "SCOLAIRE" || kind === "UNIVERSITAIRE" ? { kind } : {}),
      ...(programId ? { programLevels: { some: { programId } } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true },
  });

  return NextResponse.json({ levels });
}
