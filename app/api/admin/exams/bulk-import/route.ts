import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authorization";

const MAX_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;
function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 170);
}
export async function POST(request: Request) {
  const admin = await requireAdmin("exams.create");
  if (!admin) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length || files.length > MAX_FILES) return NextResponse.json({ error: "Sélectionne entre 1 et 20 fichiers PDF." }, { status: 400 });
  if (files.some(f => f.type !== "application/pdf" || f.size > MAX_SIZE)) return NextResponse.json({ error: "Tous les fichiers doivent être des PDF de 50 Mo maximum." }, { status: 400 });
  const targetType = String(form.get("targetType") || "");
  const titlePrefix = String(form.get("titlePrefix") || "").trim();
  const category = String(form.get("category") || "").trim();
  const academicLevelId = String(form.get("academicLevelId") || "");
  const subjectId = String(form.get("subjectId") || "") || null;
  const schoolId = String(form.get("schoolId") || "") || null;
  const programId = String(form.get("programId") || "") || null;
  const status = String(form.get("status") || "DRAFT");
  const yearText = String(form.get("year") || "");
  const year = yearText ? Number(yearText) : null;
  const isPremium = form.get("isPremium") === "true";
  const priceText = String(form.get("premiumPrice") || "");
  const premiumPrice = isPremium && priceText ? Number(priceText) : null;
  if (!["ELEVE", "ETUDIANT"].includes(targetType) || !academicLevelId || !category || !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) return NextResponse.json({ error: "Renseigne le public, le niveau, la catégorie et le statut." }, { status: 400 });
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) return NextResponse.json({ error: "Année invalide." }, { status: 400 });
  if (isPremium && (premiumPrice === null || !Number.isFinite(premiumPrice) || premiumPrice < 0)) return NextResponse.json({ error: "Renseigne un prix Premium valide." }, { status: 400 });
  if (targetType === "ETUDIANT" && !programId) return NextResponse.json({ error: "Sélectionne la filière des épreuves." }, { status: 400 });
  const level = await prisma.academicLevel.findUnique({ where: { id: academicLevelId }, select: { id: true, name: true, kind: true } });
  if (!level) return NextResponse.json({ error: "Niveau introuvable." }, { status: 400 });
  if (targetType === "ELEVE" && level.kind === "UNIVERSITAIRE") return NextResponse.json({ error: "Choisis un niveau scolaire." }, { status: 400 });
  if (targetType === "ETUDIANT" && level.kind !== "UNIVERSITAIRE") return NextResponse.json({ error: "Choisis un niveau universitaire." }, { status: 400 });
  const known = targetType === "ETUDIANT" ? ["EXERCICE","CONTROLE_CONTINU","SESSION_NORMALE","SIMULATION_BTS_DUT"] : ["EXERCICE","ANCIEN_SUJET","EXAMEN_BLANC","AUTRE"];
  if (!known.includes(category)) return NextResponse.json({ error: "Catégorie invalide pour le public sélectionné." }, { status: 400 });
  const config = await prisma.classExamConfig.findUnique({ where: { academicLevelId } });
  if (category === "EXERCICE" && config?.exercisesEnabled === false) return NextResponse.json({ error: "Les exercices sont désactivés pour ce niveau." }, { status: 400 });
  if (category === "CONTROLE_CONTINU" && config?.continuousAssessmentEnabled === false) return NextResponse.json({ error: "Le contrôle continu est désactivé." }, { status: 400 });
  if (category === "SESSION_NORMALE" && config?.normalSessionEnabled === false) return NextResponse.json({ error: "La session normale est désactivée." }, { status: 400 });
  if (category === "SIMULATION_BTS_DUT" && (!/^niv(?:eau)?\s*2$/i.test(level.name) || config?.btsDutExamEnabled !== true)) return NextResponse.json({ error: "La simulation BTS/DUT doit être activée pour le Niveau 2." }, { status: 400 });
  if (category === "ANCIEN_SUJET" && (!config?.isExamClass || config.pastExamsEnabled !== true)) return NextResponse.json({ error: "Les anciens sujets ne sont pas activés pour cette classe." }, { status: 400 });
  if (category === "EXAMEN_BLANC" && (!config?.isExamClass || config.mockExamsEnabled !== true)) return NextResponse.json({ error: "Les examens blancs ne sont pas activés pour cette classe." }, { status: 400 });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return NextResponse.json({ error: "Le stockage Supabase n'est pas configuré." }, { status: 500 });
  const created = [];
  for (const file of files) {
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 150) || "document.pdf";
    const path = "exams/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "-" + safeName;
    const upload = await fetch(supabaseUrl + "/storage/v1/object/exam-files/" + path.split("/").map(encodeURIComponent).join("/"), {
      method: "POST", headers: { Authorization: "Bearer " + secretKey, apikey: secretKey, "Content-Type": "application/pdf", "x-upsert": "false" },
      body: await file.arrayBuffer(), cache: "no-store",
    });
    if (!upload.ok) return NextResponse.json({ error: "Le stockage a échoué sur " + file.name + ". " + created.length + " épreuve(s) déjà créée(s)." }, { status: 502 });
    const fileUrl = supabaseUrl + "/storage/v1/object/public/exam-files/" + path.split("/").map(encodeURIComponent).join("/");
    const base = titlePrefix ? titlePrefix + " - " + file.name.replace(/\.pdf$/i, "") : file.name.replace(/\.pdf$/i, "");
    const title = base.slice(0, 180) || "Épreuve";
    let slug = slugify(title) || "epreuve";
    let suffix = 1;
    while (await prisma.exam.findUnique({ where: { slug }, select: { id: true } })) { suffix++; slug = (slugify(title).slice(0, 155) || "epreuve") + "-" + suffix; }
    const exam = await prisma.exam.create({ data: {
      title, slug, year, category, fileUrl, status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      isPremium, premiumPrice, subjectId, academicLevelId, schoolId, programId: targetType === "ETUDIANT" ? programId : null,
    }, select: { id: true, title: true } });
    created.push(exam);
  }
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "EXAMS_BULK_IMPORTED", entity: "Exam", metadata: { count: created.length, category, academicLevelId } } });
  return NextResponse.json({ ok: true, count: created.length, exams: created }, { status: 201 });
}
