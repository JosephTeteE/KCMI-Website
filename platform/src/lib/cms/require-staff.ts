import {
  assertAal2,
  staffHasPermission,
  type StaffProfile,
} from "@/lib/auth/session";
import type { Permission } from "@/lib/authorization/rbac";
import { humanAal2Required, humanPermissionDenied } from "@/lib/hub/humanize";
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
        message: humanAal2Required(),
      };
    }
    return {
      ok: false,
      message: "Please sign in to the Hub first, then try again.",
    };
  }

  if (!staffHasPermission(aal.session.profile, permission)) {
    return {
      ok: false,
      message: humanPermissionDenied(permission),
    };
  }

  return { ok: true, session: aal.session };
}
