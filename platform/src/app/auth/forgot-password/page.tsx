import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getChurchIdentity } from "@/content";

const identity = getChurchIdentity();

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a KCMI Hub password recovery email.",
  alternates: { canonical: "/auth/forgot-password" },
  robots: { index: false, follow: false, nocache: true },
  openGraph: {
    title: "Forgot password · KCMI Hub",
    url: `${identity.siteUrl}/auth/forgot-password`,
  },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--color-text-body)]">
        Forgot your password?
      </h1>
      <p className="hub-help mt-2 text-[var(--color-text-muted)]">
        Enter your staff email. If an account exists, we will send a recovery
        link so you can choose a new password.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
