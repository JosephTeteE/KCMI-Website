import { CopyAccountNumber } from "@/components/giving/copy-account-number";
import { getGivingAccounts, getGivingPageIntro } from "@/content";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

export const metadata = publicPageMetadata({
  title: "Giving",
  description:
    "Give to Kingdom Covenant Ministries International — bank details for general, care group, and international giving.",
  path: "/giving",
});

const givingColumn = "mx-auto max-w-4xl px-4 sm:px-6";

export default async function GivingPage() {
  const intro = getGivingPageIntro();
  const accounts = await getGivingAccounts();

  return (
    <main id="main-content">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <div className={`${givingColumn} page-masthead`}>
          <div className="stack-heading">
            <p className="text-readable-sm font-semibold tracking-wide text-[var(--color-action-primary)] uppercase">
              Stewardship
            </p>
            <h1 className="font-display text-3xl font-semibold text-balance sm:text-4xl">
              {intro.title}
            </h1>
            <p className="text-readable text-[var(--color-text-muted)]">
              {intro.lead}
            </p>
          </div>
        </div>
      </header>

      <div className={`${givingColumn} section-space`}>
        <div className="space-y-6 text-left">
          <ul className="list-disc space-y-3 pl-5 text-readable text-[var(--color-text-muted)]">
            {intro.supports.map((s) => (
              <li key={s.slice(0, 40)}>{s}</li>
            ))}
          </ul>
          <p className="text-readable text-[var(--color-text-muted)]">
            {intro.blessing}
          </p>
        </div>

        <ul className="mt-12 grid gap-6">
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
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                      SWIFT
                    </dt>
                    <dd className="mt-1 font-mono text-readable text-[var(--color-text-body)]">
                      {account.swiftCode}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {account.accountsByCurrency?.length ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {account.accountsByCurrency.map((c) => (
                    <div
                      key={c.currency}
                      className="min-w-0 rounded-[var(--radius-md)] bg-[var(--color-surface-page)] px-4 py-4"
                    >
                      <p className="text-readable-sm font-semibold text-[var(--color-text-body)]">
                        {c.currency} account number
                      </p>
                      <p className="text-break-safe mt-1 font-mono text-xl tracking-wide text-[var(--color-text-body)]">
                        {c.accountNumber}
                      </p>
                      <CopyAccountNumber
                        value={c.accountNumber}
                        label={`Copy ${c.currency} account number`}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {account.note ? (
                <p className="mt-4 text-readable-sm text-[var(--color-text-muted)]">
                  {account.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
