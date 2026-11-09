import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { getSiteNotice, getPwaInstallSetting, shouldShowNotice } from "@/lib/site-notice";
import SiteNoticeBubble from "@/components/site-notice-bubble";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import SessionHeartbeat from "@/components/session-heartbeat";
import LogoutReminder from "@/components/logout-reminder";
import ReportProblem from "@/components/report-problem";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Etudes Spaces 🇨🇲",
  description: "Apprendre. S'entraîner. Réussir.",
  applicationName: "Etudes Spaces",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Etudes Spaces" },
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
    getPwaInstallSetting(),
  ]);
  const showNotice = Boolean(notice?.enabled && shouldShowNotice(notice.audience, Boolean(user)));

  return (
    <html lang="fr">
      <body>
        {showNotice && notice && <SiteNoticeBubble notice={{ type: notice.type, title: notice.title, message: notice.message }} />}
        {user && <>
          <LogoutReminder />
          <SessionHeartbeat />
        </>}
        {children}
        <ReportProblem />
        <PwaInstallPrompt enabled={installSetting?.enabled !== false && installSetting?.value === "true"} />
      </body>
    </html>
  );
}
