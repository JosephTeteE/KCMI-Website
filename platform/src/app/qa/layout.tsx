import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "QA layout stress",
};

export default function QaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
