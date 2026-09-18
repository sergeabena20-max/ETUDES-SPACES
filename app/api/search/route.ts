import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) || "";
  if (!q) return NextResponse.json({ results: [] });

  const user = await getCurrentUser();

  const [courses, exams] = await Promise.all([
    prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, description: true, slug: true },
      take: 20,
    }),
    prisma.exam.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, description: true, slug: true },
      take: 20,
    }),
  ]);

  const results = [
    ...courses.map((course) => ({ ...course, type: "COURSE" as const })),
    ...exams.map((exam) => ({ ...exam, type: "EXAM" as const })),
  ];

  await prisma.analyticsEvent.create({
    data: {
      type: results.length ? "SEARCH_PERFORMED" : "SEARCH_NO_RESULT",
      query: q,
      userId: user?.id || undefined,
    },
  });

  if (!results.length) {
    await prisma.searchNoResult.create({
      data: { query: q, userId: user?.id || undefined },
    });
  }

  return NextResponse.json({
    results,
    message: results.length
      ? undefined
      : "Aucun résultat pour cette recherche. Cette recherche est enregistrée pour nous aider à enrichir le catalogue.",
  });
}
