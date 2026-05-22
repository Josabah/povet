import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT"]
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pov.et";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "pov.et — Ethiopia seen softly",
    template: "%s · pov.et"
  },
  description:
    "A quiet archive of everyday Ethiopian life, captured through phone photography. Submissions via Telegram.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "pov.et",
    description: "A quiet archive of everyday Ethiopian life.",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "pov.et",
    description: "A quiet archive of everyday Ethiopian life."
  }
};

export const viewport: Viewport = {
  themeColor: "#feffff",
  colorScheme: "light"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        <main className="pb-32">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
