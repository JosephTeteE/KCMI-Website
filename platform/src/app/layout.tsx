import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { getChurchIdentity } from "@/content";
import { isStagingEnvironment } from "@/lib/env";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const body = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const identity = getChurchIdentity();

export const metadata: Metadata = {
  metadataBase: new URL(identity.siteUrl),
  title: {
    default: `${identity.shortName} · ${identity.alternateName}`,
    template: `%s · ${identity.shortName}`,
  },
  description: `${identity.legalName} (${identity.alternateName}). ${identity.visionTagline}.`,
  other: {
    "color-scheme": "light",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: identity.siteUrl,
    siteName: identity.legalName,
    title: identity.legalName,
    description: identity.heroSupporting,
    images: [
      {
        url: "/media/hero/welcome-1920.jpg",
        width: 1920,
        height: 1037,
        alt: identity.legalName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: identity.legalName,
    description: identity.visionTagline,
  },
  robots: isStagingEnvironment()
    ? { index: false, follow: false, nocache: true }
    : {
        index: true,
        follow: true,
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body
        className={`${display.variable} ${body.variable} flex min-h-screen flex-col bg-[var(--color-surface-page)] text-[var(--color-text-body)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
