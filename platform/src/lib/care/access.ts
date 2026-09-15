import type { Permission } from "@/lib/authorization/rbac";
import {
  PASTORAL_READ_PERMISSIONS,
  canAccessPastoralNarratives,
} from "@/lib/authorization/rbac";
import type { CareServiceType } from "@/lib/care/types";

/** Map Hub Care domain → existing permission IDs (counselling.* = Pastoral Care). */
export function careReadPermission(service: CareServiceType): Permission {
  switch (service) {
    case "prayer":
      return "prayer.read";
    case "pastoral":
      return "counselling.read";
    case "welfare":
      return "welfare.read";
  }
}

export function careAssignPermission(service: CareServiceType): Permission {
  switch (service) {
    case "prayer":
      return "prayer.assign";
    case "pastoral":
      return "counselling.assign";
    case "welfare":
      return "welfare.assign";
  }
}

export function canViewCareHub(
  permissions: readonly Permission[] | ReadonlySet<Permission>,
): boolean {
  const set =
    permissions instanceof Set ? permissions : new Set(permissions);
  return canAccessPastoralNarratives(set);
}

export function canReadCareDomain(
  permissions: readonly Permission[] | ReadonlySet<Permission>,
  service: CareServiceType,
): boolean {
  const set =
    permissions instanceof Set ? permissions : new Set(permissions);
  return set.has(careReadPermission(service));
}

export function canAssignCareDomain(
  permissions: readonly Permission[] | ReadonlySet<Permission>,
  service: CareServiceType,
): boolean {
  const set =
    permissions instanceof Set ? permissions : new Set(permissions);
  return set.has(careAssignPermission(service));
}

/**
 * Pastoral Care row visibility (app-layer mirror of RLS):
 * - counselling.read + (assigned to self OR counselling.assign)
 * Prayer / Welfare: domain read is enough (shared team queues).
 */
export function canViewCareRequestRow(args: {
  permissions: readonly Permission[] | ReadonlySet<Permission>;
  service: CareServiceType;
  assignedTo: string | null;
  viewerId: string;
}): boolean {
  if (!canReadCareDomain(args.permissions, args.service)) return false;
  if (args.service === "pastoral") {
    if (canAssignCareDomain(args.permissions, "pastoral")) return true;
    return args.assignedTo === args.viewerId;
  }
  return true;
}

export function careDomainsForPermissions(
  permissions: readonly Permission[] | ReadonlySet<Permission>,
): CareServiceType[] {
  const domains: CareServiceType[] = [];
  for (const service of ["prayer", "pastoral", "welfare"] as const) {
    if (canReadCareDomain(permissions, service)) domains.push(service);
  }
  return domains;
}

export { PASTORAL_READ_PERMISSIONS };
