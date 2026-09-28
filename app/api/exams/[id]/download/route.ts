import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "document";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const kind = new URL(request.url).searchParams.get("kind");

  const exam = await prisma.exam.findFirst({
    where: { id, status: "PUBLISHED" },
    select: {
      title: true,
      fileUrl: true,
      solution: { select: { fileUrl: true } },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Épreuve introuvable." }, { status: 404 });
  }

  const fileUrl = kind === "solution" ? exam.solution?.fileUrl : exam.fileUrl;
  if (!fileUrl) {
    return NextResponse.json({ error: "Aucun PDF disponible." }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const allowedPrefix = supabaseUrl
    ? supabaseUrl + "/storage/v1/object/public/exam-files/"
    : "";

  if (!allowedPrefix || !fileUrl.startsWith(allowedPrefix)) {
    return NextResponse.json({ error: "Document non disponible." }, { status: 400 });
  }

  const upstream = await fetch(fileUrl, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Impossible de récupérer le PDF." }, { status: 502 });
  }

  const base = safeFilename(exam.title);
  const filename = kind === "solution" ? base + "-correction.pdf" : base + ".pdf";

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
      "Cache-Control": "private, no-store",
    },
  });
}
