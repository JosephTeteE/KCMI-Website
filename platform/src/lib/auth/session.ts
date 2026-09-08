import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import {
  type HubRole,
  type Permission,
  HUB_ROLES,
  permissionsForRoles,
} from "@/lib/authorization/rbac";

export type StaffProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  isActive: boolean;
  roles: HubRole[];
  permissions: Permission[];
};

function isHubRole(value: string): value is HubRole {
  return (HUB_ROLES as readonly string[]).includes(value);
}

function userFromClaims(claims: {
  sub?: string;
  email?: string | unknown;
}): User | null {
  if (!claims.sub) return null;
  const email =
    typeof claims.email === "string" ? claims.email : undefined;
  return {
    id: claims.sub,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
  } as User;
}

/**
 * Load authenticated staff + active profile + roles from DB when configured.
 * Uses getClaims() for JWT signature validation (Supabase SSR guidance).
 * Returns null if unauthenticated or inactive.
 */
export async function getStaffSession(): Promise<{
  user: User;
  profile: StaffProfile;
  aal: string | null;
} | null> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    return null;
  }

  const user = userFromClaims(claimsData.claims);
  if (!user) return null;

  const claimAal =
    typeof claimsData.claims.aal === "string"
      ? claimsData.claims.aal
      : null;

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return {
      user,
      profile: {
        id: user.id,
        email: user.email ?? null,
        displayName: null,
        isActive: true,
        roles: [],
        permissions: [],
      },
      aal: aalData?.currentLevel ?? claimAal,
    };
  }

  if (profileRow && profileRow.is_active === false) {
    return null;
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roles: HubRole[] = [];
  for (const row of roleRows ?? []) {
    const nested = row.roles as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(nested) ? nested[0]?.name : nested?.name;
    if (name && isHubRole(name)) roles.push(name);
  }

  const { data: aalData } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  const permissions = Array.from(permissionsForRoles(roles));

  return {
    user,
    profile: {
      id: user.id,
      email: profileRow?.email ?? user.email ?? null,
      displayName: profileRow?.display_name ?? null,
      isActive: profileRow?.is_active ?? true,
      roles,
      permissions,
    },
    aal: aalData?.currentLevel ?? claimAal,
  };
}

export function staffHasPermission(
  profile: StaffProfile,
  permission: Permission,
): boolean {
  return profile.permissions.includes(permission);
}

/** Hub requires AAL2 (enrolled + verified TOTP session). */
export function requiresMfaEnrollment(aal: string | null): boolean {
  return aal !== "aal2";
}

/**
 * Sensitive Hub actions require AAL2. Proxy is not the authorization boundary.
 */
export async function assertAal2(): Promise<
  { ok: true; session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>> } | {
    ok: false;
    reason: "unauthenticated" | "aal2_required" | "inactive_or_missing";
  }
> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, reason: "inactive_or_missing" };
  }
  if (session.aal !== "aal2") {
    return { ok: false, reason: "aal2_required" };
  }
  return { ok: true, session };
}
