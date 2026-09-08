import {
  assertAal2,
  staffHasPermission,
  type StaffProfile,
} from "@/lib/auth/session";
import type { Permission } from "@/lib/authorization/rbac";
import type { User } from "@supabase/supabase-js";

export type StaffActionSession = {
  user: User;
  profile: StaffProfile;
  aal: string | null;
};

export type RequireStaffActionResult =
  | { ok: true; session: StaffActionSession }
  | { ok: false; message: string };

/**
 * Gate Hub mutations: require AAL2 session + fine-grained permission.
 */
export async function requireStaffAction(
  permission: Permission,
): Promise<RequireStaffActionResult> {
  const aal = await assertAal2();
  if (!aal.ok) {
    if (aal.reason === "aal2_required") {
      return {
        ok: false,
        message: "Multi-factor authentication (AAL2) is required for this action.",
      };
    }
    return {
      ok: false,
      message: "You must be signed in with an active Hub account.",
    };
  }

  if (!staffHasPermission(aal.session.profile, permission)) {
    return {
      ok: false,
      message: `Missing required permission: ${permission}`,
    };
  }

  return { ok: true, session: aal.session };
}
