import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getChurchIdentity } from "@/content";

const identity = getChurchIdentity();

export const metadata: Metadata = {
  title: "Set password",
  description: "Choose a password for your KCMI Hub staff account.",
  alternates: { canonical: "/auth/set-password" },
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Set password · KCMI Hub",
    url: `${identity.siteUrl}/auth/set-password`,
  },
};

export default function SetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--color-text-body)]">
        Set your Hub password
      </h1>
      <p className="hub-help mt-2 text-[var(--color-text-muted)]">
        Choose a password for this staff account. You will not be asked for an
        old password on this first setup or recovery step.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <SetPasswordForm />
      </div>
    </div>
  );
}
