import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      return url.protocol === "https:" && (
        host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host.endsWith(".push.services.mozilla.com") ||
        host === "web.push.apple.com" ||
        host === "wns.windows.com" ||
        host.endsWith(".notify.windows.com")
      );
    } catch {
      return false;
    }
  }, "Le fournisseur de notifications n'est pas reconnu."),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(10).max(100),
  }),
});

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return NextResponse.json({ error: "Les notifications ne sont pas encore configurées." }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour activer les notifications." }, { status: 401 });

  const parsed = subscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Abonnement de notification invalide." }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { userId: true } });
  if (existing && existing.userId !== user.id) {
    return NextResponse.json({ error: "Cet abonnement est déjà associé à un autre compte." }, { status: 409 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { p256dh: keys.p256dh, auth: keys.auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour gérer les notifications." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint || endpoint.length > 2048) return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
  return NextResponse.json({ ok: true });
}
