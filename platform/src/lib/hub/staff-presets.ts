/**
 * Role presets a Super Admin may assign on Staff & Access.
 * Never includes super_admin.
 */
import type { HubRole } from "@/lib/authorization/rbac";
import { OPERATING_ROLE_LABELS } from "@/lib/authorization/rbac";

export const STAFF_ASSIGNABLE_ROLE_PRESETS = [
  {
    role: "media_admin" as const satisfies HubRole,
    checkboxLabel: "Website & Media",
    title: "HQ Content Admin",
    description:
      "Website pages, Programs, Events, Sermons, Photos, Branches, Livestream, and website Messages & Requests.",
  },
  {
    role: "care_operator" as const satisfies HubRole,
    checkboxLabel: "Care",
    title: "Care Staff",
    description: "Prayer, Pastoral Care and Welfare requests.",
  },
  {
    role: "prayer_staff" as const satisfies HubRole,
    checkboxLabel: "Prayer",
    title: "Prayer Staff",
    description: "Prayer requests only.",
  },
  {
    role: "finance_reviewer" as const satisfies HubRole,
    checkboxLabel: "Finance",
    title: "Finance Reviewer",
    description:
      "Giving review/approval responsibilities according to existing Giving access.",
  },
] as const;

export type StaffAssignableRole =
  (typeof STAFF_ASSIGNABLE_ROLE_PRESETS)[number]["role"];

const ASSIGNABLE_SET = new Set<string>(
  STAFF_ASSIGNABLE_ROLE_PRESETS.map((preset) => preset.role),
);

export function isStaffAssignableRole(value: string): value is StaffAssignableRole {
  return ASSIGNABLE_SET.has(value);
}

export function parseAssignableRolesFromForm(
  formData: FormData,
): StaffAssignableRole[] {
  const raw = formData.getAll("roles");
  const selected: StaffAssignableRole[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    if (!isStaffAssignableRole(entry)) continue;
    if (!selected.includes(entry)) selected.push(entry);
  }
  return selected;
}

export function staffRoleDisplayLabel(role: HubRole): string {
  if (role === "media_admin") return "Website & Media";
  if (role === "care_operator") return "Care";
  if (role === "prayer_staff") return "Prayer";
  if (role === "finance_reviewer") return "Finance";
  return OPERATING_ROLE_LABELS[role];
}
