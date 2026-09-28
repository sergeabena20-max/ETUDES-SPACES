import { prisma } from "@/lib/prisma";

export async function getSiteNotice() {
  try {
    return await prisma.siteNotice.findUnique({ where: { id: "main" } });
  } catch {
    return null;
  }
}
