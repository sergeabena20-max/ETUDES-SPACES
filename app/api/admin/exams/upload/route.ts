import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request) {
  const admin = await requireAdmin("exams.create");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier PDF reçu." }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Le PDF ne doit pas dépasser 50 MB." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return NextResponse.json({ error: "Le stockage Supabase n'est pas configuré." }, { status: 500 });
  }

  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);

  const path = `exams/${Date.now()}-${safeName || "document.pdf"}`;
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/exam-files/${encodeURIComponent(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        apikey: secretKey,
        "Content-Type": "application/pdf",
        "x-upsert": "false",
      },
      body: await file.arrayBuffer(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Supabase Storage upload failed:", detail);
    return NextResponse.json({ error: "Impossible d'envoyer le PDF vers le stockage." }, { status: 502 });
  }

  const url = `${supabaseUrl}/storage/v1/object/public/exam-files/${path.split("/").map(encodeURIComponent).join("/")}`;
  return NextResponse.json({ ok: true, url, path });
}
