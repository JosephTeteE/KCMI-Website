import { PageShell } from "@/components/layout/page-shell";
import { CopyAccountNumber } from "@/components/giving/copy-account-number";
import { getGivingAccounts, getGivingPageIntro } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Giving",
  description:
    "Give to Kingdom Covenant Ministries International — bank details for general, care group, and international giving.",
  path: "/giving",
});

export default async function GivingPage() {
  const intro = getGivingPageIntro();
  const accounts = await getGivingAccounts();

  return (
    <PageShell eyebrow="Stewardship" title={intro.title} description={intro.lead}>
      <div className="mx-auto max-w-3xl space-y-6">
        <ul className="list-disc space-y-3 pl-5 text-readable text-[var(--color-text-muted)]">
          {intro.supports.map((s) => (
            <li key={s.slice(0, 40)}>{s}</li>
          ))}
        </ul>
        <p className="text-readable text-[var(--color-text-muted)]">{intro.blessing}</p>
      </div>

      <ul className="mt-12 grid gap-6 lg:grid-cols-1">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 sm:p-8"
          >
            <h2 className="font-display text-2xl font-semibold text-[var(--color-action-primary)]">
              {account.purpose}
            </h2>
            <p className="text-readable mt-3 text-[var(--color-text-muted)]">
              {account.description}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                  Account name
                </dt>
                <dd className="text-break-safe text-readable mt-1 text-[var(--color-text-muted)]">
                  {account.accountName}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                  Bank
                </dt>
                <dd className="text-readable mt-1 text-[var(--color-text-muted)]">
                  {account.bankName}
                </dd>
              </div>
              {account.accountNumber ? (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                    Account number
                  </dt>
                  <dd className="text-break-safe mt-1 font-mono text-xl tracking-wide text-[var(--color-text-body)]">
                    {account.accountNumber}
                  </dd>
                  <CopyAccountNumber value={account.accountNumber} />
                </div>
              ) : null}
              {account.swiftCode ? (
                <div className="min-w-0">
                  <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                    SWIFT
                  </dt>
                  <dd className="mt-1 font-mono text-readable text-[var(--color-text-body)]">
                    {account.swiftCode}
                  </dd>
                </div>
              ) : null}
              {account.accountsByCurrency?.map((c) => (
                <div key={c.currency} className="min-w-0">
                  <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                    {c.currency} account number
                  </dt>
                  <dd className="text-break-safe mt-1 font-mono text-xl tracking-wide text-[var(--color-text-body)]">
                    {c.accountNumber}
                  </dd>
                  <CopyAccountNumber
                    value={c.accountNumber}
                    label={`Copy ${c.currency} account number`}
                  />
                </div>
              ))}
            </dl>
            {account.note ? (
              <p className="mt-4 text-readable-sm text-[var(--color-text-muted)]">
                {account.note}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
