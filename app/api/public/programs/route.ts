import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const programs = await prisma.program.findMany({
    where: { kind: "FILIERE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ programs });
}
