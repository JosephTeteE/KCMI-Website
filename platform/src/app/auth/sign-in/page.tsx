import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getChurchIdentity } from "@/content";
import { isStagingEnvironment } from "@/lib/env";

const identity = getChurchIdentity();

export const metadata: Metadata = {
  title: "Hub sign in",
  description: "Staff sign in for the KCMI Hub.",
  alternates: { canonical: "/auth/sign-in" },
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Hub sign in · KCMI",
    url: `${identity.siteUrl}/auth/sign-in`,
  },
};

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      {isStagingEnvironment() ? (
        <p className="sr-only">This Hub sign-in page is not for search indexing.</p>
      ) : null}
      <h1 className="text-2xl font-semibold text-[var(--color-text-body)]">
        KCMI Hub sign in
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Staff only. After you sign in, you will set up a 6-digit app code for
        extra safety.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <SignInForm />
      </div>
    </div>
  );
}
