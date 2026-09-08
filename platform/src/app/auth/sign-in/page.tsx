import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--color-text-body)]">
        KCMI Hub sign in
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Staff only. MFA enrollment is required before Hub access is complete
        (ADR-0003).
      </p>
      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <SignInForm />
      </div>
    </div>
  );
}
