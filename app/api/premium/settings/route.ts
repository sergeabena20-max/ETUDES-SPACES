import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.premiumSettings.findUnique({
    where: { id: "main" },
    select: {
      enabled: true, premiumPrice: true, durationDays: true,
      orangeMoneyNumber: true, orangeMoneyName: true,
      mtnMomoNumber: true, mtnMomoName: true,
      whatsappNumber: true, paymentInstructions: true,
    },
  });
  if (!settings) return NextResponse.json({ enabled: false });
  return NextResponse.json({ ...settings, premiumPrice: settings.premiumPrice.toString() });
}
