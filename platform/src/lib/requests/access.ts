import type { Permission } from "@/lib/authorization/rbac";

export function canViewRequestsInbox(
  permissions: readonly Permission[],
): boolean {
  return permissions.includes("requests.read");
}

export function canUpdateRequests(
  permissions: readonly Permission[],
): boolean {
  return permissions.includes("requests.update");
}

export function canAssignRequests(
  permissions: readonly Permission[],
): boolean {
  return permissions.includes("requests.assign");
}
