import type { ReactNode } from "react";
import { groupBranchesByCountry } from "@/content/branch-groups";
import type { Branch } from "@/content/types";

type Props = {
  branches: Branch[];
  headingLevel?: "h2" | "h3";
  children: (branch: Branch) => ReactNode;
};

export function BranchCountryGroups({
  branches,
  headingLevel = "h2",
  children,
}: Props) {
  const groups = groupBranchesByCountry(branches);
  const Heading = headingLevel;

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section
          key={group.country ?? "unlabeled"}
          aria-labelledby={`branch-country-${group.country ?? "other"}`}
        >
          <Heading
            id={`branch-country-${group.country ?? "other"}`}
            className="font-display text-2xl font-semibold text-[var(--color-text-body)]"
          >
            {group.heading}
          </Heading>
          <ul className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {group.branches.map((branch) => (
              <li key={branch.slug} className="min-w-0">
                {children(branch)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
