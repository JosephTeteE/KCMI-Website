import type { User } from "@supabase/supabase-js";
import type { HubRole } from "@/lib/authorization/rbac";
import { HUB_ROLES } from "@/lib/authorization/rbac";
import { createSecretKeyClient } from "@/lib/supabase/admin";
import {
  staffRoleDisplayLabel,
  type StaffAssignableRole,
} from "@/lib/hub/staff-presets";

export type StaffAccountStatus =
  | "invitation_pending"
  | "active"
  | "disabled";

export type StaffMfaStatus = "mfa_ready" | "mfa_required";

export type HubStaffMember = {
  id: string;
  email: string | null;
  displayName: string | null;
  roles: HubRole[];
  roleLabels: string[];
  accountStatus: StaffAccountStatus;
  accountStatusLabel: string;
  mfaStatus: StaffMfaStatus;
  mfaStatusLabel: string;
  isSuperAdmin: boolean;
  assignableRoles: StaffAssignableRole[];
};

function isHubRole(value: string): value is HubRole {
  return (HUB_ROLES as readonly string[]).includes(value);
}

function accountStatusFor(input: {
  isActive: boolean;
  authUser: User | undefined;
}): StaffAccountStatus {
  if (!input.isActive) return "disabled";
  const user = input.authUser;
  if (!user) return "active";
  if (!user.email_confirmed_at && user.invited_at) {
    return "invitation_pending";
  }
  if (user.invited_at && !user.last_sign_in_at) {
    return "invitation_pending";
  }
  return "active";
}

function accountStatusLabel(status: StaffAccountStatus): string {
  switch (status) {
    case "invitation_pending":
      return "Invitation pending";
    case "disabled":
      return "Disabled";
    default:
      return "Active";
  }
}

async function mfaStatusForUser(
  admin: ReturnType<typeof createSecretKeyClient>,
  userId: string,
): Promise<StaffMfaStatus> {
  try {
    const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
    if (error) return "mfa_required";
    const factors = data?.factors ?? [];
    const verified = factors.some(
      (factor) =>
        factor.factor_type === "totp" && factor.status === "verified",
    );
    return verified ? "mfa_ready" : "mfa_required";
  } catch {
    return "mfa_required";
  }
}

/**
 * List Hub staff (profiles with at least one role, or inactive profiles kept for audit).
 * Uses secret-key Admin Auth only for MFA + invite metadata — never returned to the client as secrets.
 */
export async function listHubStaffMembers(): Promise<HubStaffMember[]> {
  const admin = createSecretKeyClient();

  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .select("id, email, display_name, is_active")
    .order("email", { ascending: true });
  if (profileError) {
    throw new Error(`Could not load staff directory: ${profileError.message}`);
  }

  const { data: roleRows, error: roleError } = await admin
    .from("user_roles")
    .select("user_id, roles(name)");
  if (roleError) {
    throw new Error(`Could not load staff access: ${roleError.message}`);
  }

  const rolesByUser = new Map<string, HubRole[]>();
  for (const row of roleRows ?? []) {
    const name =
      row.roles &&
      typeof row.roles === "object" &&
      "name" in row.roles &&
      typeof (row.roles as { name: unknown }).name === "string"
        ? (row.roles as { name: string }).name
        : null;
    if (!name || !isHubRole(name)) continue;
    const list = rolesByUser.get(row.user_id) ?? [];
    if (!list.includes(name)) list.push(name);
    rolesByUser.set(row.user_id, list);
  }

  const authById = new Map<string, User>();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw new Error(`Could not load account status: ${error.message}`);
    }
    for (const user of data.users) {
      authById.set(user.id, user);
    }
    if (data.users.length < 200) break;
    page += 1;
    if (page > 20) break;
  }

  const members: HubStaffMember[] = [];
  for (const profile of profileRows ?? []) {
    const roles = rolesByUser.get(profile.id) ?? [];
    if (roles.length === 0 && profile.is_active) {
      // Skip active profiles with no Hub roles (not Hub staff).
      continue;
    }
    if (roles.length === 0 && !profile.is_active) {
      // Keep disabled former staff visible for audit continuity.
    }

    const authUser = authById.get(profile.id);
    const accountStatus = accountStatusFor({
      isActive: profile.is_active,
      authUser,
    });
    const mfaStatus = await mfaStatusForUser(admin, profile.id);
    const isSuperAdmin = roles.includes("super_admin");
    const assignableRoles = roles.filter(
      (role): role is StaffAssignableRole =>
        role === "media_admin" ||
        role === "care_operator" ||
        role === "prayer_staff" ||
        role === "finance_reviewer",
    );

    members.push({
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      roles,
      roleLabels: roles.map((role) => staffRoleDisplayLabel(role)),
      accountStatus,
      accountStatusLabel: accountStatusLabel(accountStatus),
      mfaStatus,
      mfaStatusLabel:
        mfaStatus === "mfa_ready" ? "MFA set up" : "MFA setup required",
      isSuperAdmin,
      assignableRoles,
    });
  }

  members.sort((a, b) => {
    const ae = (a.email ?? "").toLowerCase();
    const be = (b.email ?? "").toLowerCase();
    return ae.localeCompare(be);
  });

  return members;
}

export async function findAuthUserIdByEmail(
  email: string,
): Promise<string | null> {
  const admin = createSecretKeyClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      throw new Error(error.message);
    }
    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );
    if (match) return match.id;
    if (data.users.length < 200) return null;
    page += 1;
    if (page > 20) return null;
  }
}

export async function loadRoleIdMap(): Promise<Map<HubRole, string>> {
  const admin = createSecretKeyClient();
  const { data, error } = await admin.from("roles").select("id, name");
  if (error) {
    throw new Error(`Could not load access roles: ${error.message}`);
  }
  const map = new Map<HubRole, string>();
  for (const row of data ?? []) {
    if (isHubRole(row.name)) {
      map.set(row.name, row.id);
    }
  }
  return map;
}
