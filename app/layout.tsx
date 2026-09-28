import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { getSiteNotice, shouldShowNotice } from "@/lib/site-notice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Études Space 🇨🇲",
  description: "Apprendre. S'entraîner. Réussir.",
};

function noticeClass(type: string) {
  if (type === "MAINTENANCE") return "border-amber-300 bg-amber-50 text-amber-950";
  if (type === "WARNING") return "border-red-300 bg-red-50 text-red-950";
  if (type === "SUCCESS") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  return "border-sky-300 bg-sky-50 text-sky-950";
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [notice, user] = await Promise.all([getSiteNotice(), getCurrentUser()]);
  const showNotice = Boolean(notice?.enabled && shouldShowNotice(notice.audience, Boolean(user)));

  return (
    <html lang="fr">
      <body>
        {showNotice && notice && (
          <div className={"border-b px-4 py-3 " + noticeClass(notice.type)}>
            <div className="mx-auto max-w-7xl">
              <p className="font-bold">{notice.title}</p>
              <p className="mt-0.5 text-sm">{notice.message}</p>
            </div>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
