import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { getSiteNotice, shouldShowNotice } from "@/lib/site-notice";
import SiteNoticeBubble from "@/components/site-notice-bubble";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import ReportProblem from "@/components/report-problem";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Etudes Space 🇨🇲",
  description: "Apprendre. S'entraîner. Réussir.",
  applicationName: "Etudes Space",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Etudes Space" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/etudes-space.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/etudes-space.svg", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [notice, user, installSetting] = await Promise.all([
    getSiteNotice(),
    getCurrentUser(),
    prisma.platformSetting.findUnique({ where: { key: "PWA_INSTALL_PROMPT_ENABLED" }, select: { value: true, enabled: true } }).catch(() => null),
  ]);
  const showNotice = Boolean(notice?.enabled && shouldShowNotice(notice.audience, Boolean(user)));

  return (
    <html lang="fr">
      <body>
        {showNotice && notice && <SiteNoticeBubble notice={{ type: notice.type, title: notice.title, message: notice.message }} />}
        {children}
        <ReportProblem />
        <PwaInstallPrompt enabled={installSetting?.enabled !== false && installSetting?.value === "true"} />
      </body>
    </html>
  );
}
