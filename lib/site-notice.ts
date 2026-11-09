import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

type NoticeAudience = "BEFORE_LOGIN" | "AFTER_LOGIN" | "BOTH";

export function shouldShowNotice(audience: NoticeAudience, isAuthenticated: boolean) {
  if (audience === "BOTH") return true;
  if (audience === "AFTER_LOGIN") return isAuthenticated;
  return !isAuthenticated;
}

export const getSiteNotice = unstable_cache(
  async () => {
    try {
      return await prisma.siteNotice.findUnique({ where: { id: "main" } });
    } catch {
      return null;
    }
  },
  ["site-notice-v1"],
  { revalidate: 60 },
);

export const getPwaInstallSetting = unstable_cache(
  async () => prisma.platformSetting.findUnique({
    where: { key: "PWA_INSTALL_PROMPT_ENABLED" },
    select: { value: true, enabled: true },
  }).catch(() => null),
  ["pwa-install-setting-v1"],
  { revalidate: 60 },
);
