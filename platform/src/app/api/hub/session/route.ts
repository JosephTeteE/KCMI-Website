import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";
import {
  permissionsForRoles,
  type HubRole,
  HUB_ROLES,
  type Permission,
} from "@/lib/authorization/rbac";
import { requiresMfaEnrollment } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type AnySupabase = Awaited<ReturnType<typeof createServerSupabase>>;

function isHubRole(value: string): value is HubRole {
  return (HUB_ROLES as readonly string[]).includes(value);
}

async function resolveFromSupabase(
  supabase: AnySupabase,
  jwt?: string,
) {
  const { data: claimsData, error } = jwt
    ? await supabase.auth.getClaims(jwt)
    : await supabase.auth.getClaims();

  if (error || !claimsData?.claims?.sub) {
    return null;
  }

  const userId = String(claimsData.claims.sub);
  const claimAal =
    typeof claimsData.claims.aal === "string" ? claimsData.claims.aal : null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, email, display_name, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profileRow && profileRow.is_active === false) {
    return { kind: "inactive" as const };
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  const roles: HubRole[] = [];
  for (const row of roleRows ?? []) {
    const nested = row.roles as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(nested) ? nested[0]?.name : nested?.name;
    if (name && isHubRole(name)) roles.push(name);
  }

  let aal = claimAal;
  try {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel) aal = aalData.currentLevel;
  } catch {
    // Bearer-only clients may lack a full session; JWT aal claim is authoritative enough here.
  }

  const permissions = Array.from(permissionsForRoles(roles)) as Permission[];

  return {
    kind: "ok" as const,
    aal,
    isActive: profileRow?.is_active ?? true,
    roles,
    permissions,
    hubAccess: permissions.includes("hub.access"),
    needsMfa: requiresMfaEnrollment(aal),
    aal2ActionAllowed: aal === "aal2",
  };
}

/**
 * Hub session / gate probe (foundation validation + shell).
 * Accepts cookie session (SSR) or Authorization: Bearer access_token.
 */
export async function GET(request: NextRequest) {
  const bearer = request.headers.get("authorization");
  let resolved;

  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice("Bearer ".length).trim();
    const { url, publishableKey } = requireSupabasePublicConfig();
    const supabase = createSupabaseJs<Database>(url, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    resolved = await resolveFromSupabase(supabase as unknown as AnySupabase, token);
  } else {
    const supabase = await createServerSupabase();
    resolved = await resolveFromSupabase(supabase);
  }

  if (!resolved) {
    return NextResponse.json(
      {
        authenticated: false,
        gate: "sign-in",
        aal: null,
        permissions: [],
      },
      { status: 401 },
    );
  }

  if (resolved.kind === "inactive") {
    return NextResponse.json(
      {
        authenticated: false,
        gate: "inactive",
        aal: null,
        permissions: [],
      },
      { status: 403 },
    );
  }

  let gate: "ok" | "mfa" | "denied" = "ok";
  if (resolved.needsMfa) gate = "mfa";
  else if (!resolved.hubAccess) gate = "denied";

  return NextResponse.json({
    authenticated: true,
    gate,
    aal: resolved.aal,
    isActive: resolved.isActive,
    roles: resolved.roles,
    permissions: resolved.permissions,
    aal2ActionAllowed: resolved.aal2ActionAllowed,
    aal2DenyReason: resolved.aal2ActionAllowed ? null : "aal2_required",
  });
}
