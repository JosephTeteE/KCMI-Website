/**
 * Stable Hub roles (ADR-0003). Super Admin ≠ automatic pastoral access.
 */
export const HUB_ROLES = [
  "super_admin",
  "pastoral_admin",
  "pastor",
  "prayer_staff",
  "care_operator",
  "media_admin",
  "branch_admin",
  "program_drafter",
  "registrar",
  "finance_reviewer",
  "auditor",
] as const;

export type HubRole = (typeof HUB_ROLES)[number];

/**
 * Fine-grained permissions used by foundation + later phases.
 * Pastoral permissions are never implied by super_admin alone.
 */
export const PERMISSIONS = [
  "prayer.read",
  "prayer.assign",
  "counselling.read",
  "counselling.assign",
  "welfare.read",
  "welfare.assign",
  "programs.create",
  "programs.update",
  "programs.publish",
  "sermons.manage",
  "events.manage",
  "registrations.manage",
  "payment_evidence.review",
  "giving.propose",
  "giving.approve",
  "users.manage",
  "livestream.manage",
  "media.manage",
  "website.manage",
  "branches.manage",
  "requests.read",
  "requests.update",
  "requests.assign",
  "audit.read",
  "hub.access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** HIGHLY_SENSITIVE Care permissions — runtime must be DB-authoritative (fail closed). */
export const CARE_PERMISSIONS: readonly Permission[] = [
  "prayer.read",
  "prayer.assign",
  "counselling.read",
  "counselling.assign",
  "welfare.read",
  "welfare.assign",
] as const;

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function isCarePermission(value: string): boolean {
  return (CARE_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Effective Hub permissions for a staff session.
 *
 * - Non-Care: TypeScript role defaults ∪ DB `role_permissions` (compat fallback).
 * - Care (HIGHLY_SENSITIVE): **DB grants only**. TS defaults never restore or expand
 *   a Care permission that is absent/revoked in the database.
 *
 * TS `DEFAULT_ROLE_PERMISSIONS` remains for seeds, migrations, tests, and docs —
 * not as a silent Care allow path at runtime.
 */
export function mergeStaffPermissions(
  roles: readonly HubRole[],
  dbPermissionNames: readonly string[],
): Permission[] {
  const dbCareAndOther = new Set<Permission>();
  for (const name of dbPermissionNames) {
    if (isPermission(name)) dbCareAndOther.add(name);
  }

  const effective = new Set<Permission>();
  for (const p of permissionsForRoles(roles)) {
    if (!isCarePermission(p)) {
      effective.add(p);
    }
  }
  for (const p of dbCareAndOther) {
    effective.add(p);
  }
  return Array.from(effective);
}

export const PASTORAL_READ_PERMISSIONS: readonly Permission[] = [
  "prayer.read",
  "counselling.read",
  "welfare.read",
] as const;

/** Default permission grants by role for seed data (foundation). */
export const DEFAULT_ROLE_PERMISSIONS: Record<HubRole, readonly Permission[]> =
  {
    super_admin: [
      "hub.access",
      "users.manage",
      "programs.create",
      "programs.update",
      "programs.publish",
      "sermons.manage",
      "events.manage",
      "registrations.manage",
      "payment_evidence.review",
      "giving.propose",
      "giving.approve",
      "livestream.manage",
      "media.manage",
      "website.manage",
      "branches.manage",
      "requests.read",
      "requests.update",
      "requests.assign",
      "audit.read",
      // Intentionally NO pastoral read/assign — must be granted explicitly
    ],
    pastoral_admin: [
      "hub.access",
      "prayer.read",
      "prayer.assign",
      "counselling.read",
      "counselling.assign",
      "welfare.read",
      "welfare.assign",
      "audit.read",
    ],
    pastor: ["hub.access"], // case-scoped pastoral perms assigned explicitly
    prayer_staff: ["hub.access", "prayer.read"],
    care_operator: [
      "hub.access",
      "prayer.read",
      "prayer.assign",
      "counselling.read",
      "counselling.assign",
      "welfare.read",
      "welfare.assign",
      // Intentionally NO users/giving/media/website/branches/livestream/events/sermons/audit
    ],
    media_admin: [
      "hub.access",
      "programs.create",
      "programs.update",
      "programs.publish",
      "sermons.manage",
      "events.manage",
      "media.manage",
      "website.manage",
      "livestream.manage",
      "branches.manage",
      "requests.read",
      "requests.update",
      "requests.assign",
      // Operating name: HQ Content Admin.
      // events.manage = Event CONTENT only.
      // Intentionally NO registrations.manage or payment_evidence.review.
      // No pastoral, users.manage, giving.propose, or giving.approve.
    ],
    program_drafter: [
      "hub.access",
      "programs.create",
      "programs.update",
      // Intentionally NO programs.publish
    ],
    branch_admin: ["hub.access", "branches.manage"],
    registrar: ["hub.access", "registrations.manage", "events.manage"],
    finance_reviewer: [
      "hub.access",
      "payment_evidence.review",
      "giving.propose",
      "giving.approve",
    ],
    auditor: ["hub.access", "audit.read"],
  };

export function roleHasPermission(
  role: HubRole,
  permission: Permission,
  extraPermissions: readonly Permission[] = [],
): boolean {
  const fromRole = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  return fromRole.includes(permission) || extraPermissions.includes(permission);
}

export function permissionsForRoles(
  roles: readonly HubRole[],
  extraPermissions: readonly Permission[] = [],
): Set<Permission> {
  const set = new Set<Permission>(extraPermissions);
  for (const role of roles) {
    for (const p of DEFAULT_ROLE_PERMISSIONS[role]) {
      set.add(p);
    }
  }
  return set;
}

export function canAccessPastoralNarratives(
  permissions: ReadonlySet<Permission>,
): boolean {
  return PASTORAL_READ_PERMISSIONS.some((p) => permissions.has(p));
}

/** Visitor-facing Hub labels for the initial operating model (D1.4). */
export const OPERATING_ROLE_LABELS: Record<HubRole, string> = {
  super_admin: "Super Admin",
  pastoral_admin: "Pastoral Admin",
  pastor: "Pastor",
  prayer_staff: "Prayer staff",
  care_operator: "Care operator",
  media_admin: "HQ Content Admin",
  branch_admin: "Branch Admin",
  program_drafter: "Program drafter",
  registrar: "Registrar",
  finance_reviewer: "Finance reviewer",
  auditor: "Auditor",
};

export function operatingRoleLabel(role: HubRole): string {
  return OPERATING_ROLE_LABELS[role];
}

export function assertMediaCannotReadPastoral(
  roles: readonly HubRole[],
): boolean {
  if (!roles.includes("media_admin")) return true;
  const perms = permissionsForRoles(roles);
  return !canAccessPastoralNarratives(perms);
}
