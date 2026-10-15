import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { getSiteNotice, shouldShowNotice } from "@/lib/site-notice";
import SiteNoticeBubble from "@/components/site-notice-bubble";
import PwaInstallPrompt from "@/components/pwa-install-prompt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Études Space 🇨🇲",
  description: "Apprendre. S'entraîner. Réussir.",
  applicationName: "Études Space",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Études Space" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/etudes-space.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/etudes-space.svg", type: "image/svg+xml" }],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [notice, user] = await Promise.all([getSiteNotice(), getCurrentUser()]);
  const showNotice = Boolean(notice?.enabled && shouldShowNotice(notice.audience, Boolean(user)));

  return (
    <html lang="fr">
      <body>
        {showNotice && notice && <SiteNoticeBubble notice={{ type: notice.type, title: notice.title, message: notice.message }} />}
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
