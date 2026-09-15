import Link from "next/link";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import { createCareFixtureAction } from "@/app/admin/care/actions";
import {
  canAssignCareDomain,
  careDomainsForPermissions,
} from "@/lib/care/access";
import { requireCareSession } from "@/lib/care/queries";
import { CARE_SERVICE_LABELS, CARE_TAB_HREFS } from "@/lib/care/types";
import { getPublicEnv } from "@/lib/env/public";
import { humanAal2Required } from "@/lib/hub/humanize";

type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function CareHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const gate = await requireCareSession();
  if (!gate.ok) {
    return (
      <div>
        <HubPageHeader title="Care" />
        <p className="text-base text-[var(--color-text-muted)]">
          {gate.reason === "aal2_required"
            ? humanAal2Required()
            : "Your account cannot open Care requests."}
        </p>
      </div>
    );
  }

  const domains = careDomainsForPermissions(gate.session.profile.permissions);
  const allowFixtures = getPublicEnv().KCMI_ENVIRONMENT !== "production";

  return (
    <div>
      <HubPageHeader
        title="Care"
        description="Private prayer, pastoral care, and welfare requests. Visitor intake still uses Google Forms until later phases. Narratives are highly sensitive — no export, Search, or AI."
      />
      <HubFlash message={params.message} error={params.error} />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((service) => (
          <li key={service}>
            <Link
              href={CARE_TAB_HREFS[service]}
              className="flex min-h-28 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 hover:border-[var(--color-action-primary)]"
            >
              <h2 className="text-xl font-semibold">{CARE_SERVICE_LABELS[service]}</h2>
              <p className="mt-2 text-base text-[var(--color-text-muted)]">
                Open the {CARE_SERVICE_LABELS[service]} queue
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {allowFixtures ? (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-5">
          <h2 className="text-lg font-semibold">Synthetic fixtures (non-production)</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Creates clearly labelled fake requests for Hub review. Not available in
            production. Requires domain assign permission.
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {domains
              .filter((service) =>
                canAssignCareDomain(gate.session.profile.permissions, service),
              )
              .map((service) => (
                <li key={service}>
                  <form action={createCareFixtureAction}>
                    <input type="hidden" name="serviceType" value={service} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-base font-semibold"
                    >
                      Add {CARE_SERVICE_LABELS[service]} fixture
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
