import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Études Space 🇨🇲",
  description: "Apprendre. S'entraîner. Réussir.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}