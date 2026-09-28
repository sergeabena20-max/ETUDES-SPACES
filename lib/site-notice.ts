import { prisma } from "@/lib/prisma";

type NoticeAudience = "BEFORE_LOGIN" | "AFTER_LOGIN" | "BOTH";

export function shouldShowNotice(audience: NoticeAudience, isAuthenticated: boolean) {
  if (audience === "BOTH") return true;
  if (audience === "AFTER_LOGIN") return isAuthenticated;
  return !isAuthenticated;
}

export async function getSiteNotice() {
  try {
    return await prisma.siteNotice.findUnique({ where: { id: "main" } });
  } catch {
    return null;
  }
}
