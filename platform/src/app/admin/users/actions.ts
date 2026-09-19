"use server";

import { requireStaffAction } from "@/lib/cms/require-staff";
import { writeAuditEvent } from "@/lib/cms/audit";
import { redirectWithError, redirectWithMessage } from "@/lib/cms/hub-flash";
import { staffInviteRedirectTo } from "@/lib/hub/staff-invite-url";
import {
  findAuthUserIdByEmail,
  loadRoleIdMap,
} from "@/lib/hub/staff-directory";
import {
  parseAssignableRolesFromForm,
  type StaffAssignableRole,
} from "@/lib/hub/staff-presets";
import type { HubRole } from "@/lib/authorization/rbac";
import { createSecretKeyClient } from "@/lib/supabase/admin";

const STAFF_PATH = "/admin/users";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function currentRolesForUser(
  admin: ReturnType<typeof createSecretKeyClient>,
  userId: string,
): Promise<HubRole[]> {
  const { data, error } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  const roles: HubRole[] = [];
  for (const row of data ?? []) {
    const name =
      row.roles &&
      typeof row.roles === "object" &&
      "name" in row.roles &&
      typeof (row.roles as { name: unknown }).name === "string"
        ? ((row.roles as { name: string }).name as HubRole)
        : null;
    if (name && !roles.includes(name)) roles.push(name);
  }
  return roles;
}

async function replaceAssignableRoles(input: {
  admin: ReturnType<typeof createSecretKeyClient>;
  userId: string;
  nextAssignable: StaffAssignableRole[];
  preserveSuperAdmin: boolean;
}): Promise<HubRole[]> {
  const roleIds = await loadRoleIdMap();
  const existing = await currentRolesForUser(input.admin, input.userId);
  const keepSuper = input.preserveSuperAdmin || existing.includes("super_admin");

  // Remove only assignable preset roles; never touch super_admin / other roles here.
  const assignableNames: StaffAssignableRole[] = [
    "media_admin",
    "care_operator",
    "prayer_staff",
    "finance_reviewer",
  ];
  for (const role of assignableNames) {
    const roleId = roleIds.get(role);
    if (!roleId) continue;
    const { error } = await input.admin
      .from("user_roles")
      .delete()
      .eq("user_id", input.userId)
      .eq("role_id", roleId);
    if (error) {
      throw new Error(error.message);
    }
  }

  for (const role of input.nextAssignable) {
    const roleId = roleIds.get(role);
    if (!roleId) {
      throw new Error(`Missing role definition for ${role}.`);
    }
    const { error } = await input.admin.from("user_roles").upsert(
      { user_id: input.userId, role_id: roleId },
      { onConflict: "user_id,role_id" },
    );
    if (error) {
      throw new Error(error.message);
    }
  }

  if (keepSuper) {
    const superId = roleIds.get("super_admin");
    if (superId) {
      await input.admin.from("user_roles").upsert(
        { user_id: input.userId, role_id: superId },
        { onConflict: "user_id,role_id" },
      );
    }
  }

  return currentRolesForUser(input.admin, input.userId);
}

export async function inviteStaffMember(formData: FormData) {
  const gate = await requireStaffAction("users.manage");
  if (!gate.ok) {
    redirectWithError(STAFF_PATH, gate.message);
  }

  const emailRaw = emptyToNull(formData.get("email"));
  const displayName = emptyToNull(formData.get("display_name"));
  const roles = parseAssignableRolesFromForm(formData);

  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    redirectWithError(STAFF_PATH, "Enter a valid email address.");
  }
  if (roles.length === 0) {
    redirectWithError(
      STAFF_PATH,
      "Choose at least one access option for this person.",
    );
  }

  const email = normalizeEmail(emailRaw);
  const existingId = await findAuthUserIdByEmail(email);
  if (existingId) {
    redirectWithError(
      `${STAFF_PATH}?focus=${existingId}`,
      "This person already has a KCMI Hub account. You can update their access below.",
    );
  }

  const admin = createSecretKeyClient();
  let redirectTo: string;
  try {
    redirectTo = staffInviteRedirectTo();
  } catch (error) {
    redirectWithError(
      STAFF_PATH,
      error instanceof Error
        ? error.message
        : "The website address for invitations is not configured correctly.",
    );
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: displayName ? { display_name: displayName } : undefined,
    redirectTo,
  });

  if (error || !data.user) {
    const message = error?.message?.toLowerCase() ?? "";
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      redirectWithError(
        STAFF_PATH,
        "This person already has a KCMI Hub account. You can update their access below.",
      );
    }
    redirectWithError(
      STAFF_PATH,
      "We could not send that invitation. Please check the email and try again.",
    );
  }

  const userId = data.user.id;
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      display_name: displayName,
      is_active: true,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    redirectWithError(
      STAFF_PATH,
      "Invitation was created, but the staff profile could not be saved. Ask Tech for help.",
    );
  }

  try {
    await replaceAssignableRoles({
      admin,
      userId,
      nextAssignable: roles,
      preserveSuperAdmin: false,
    });
  } catch {
    redirectWithError(
      STAFF_PATH,
      "Invitation was sent, but access roles could not be saved. Ask Tech for help.",
    );
  }

  await writeAuditEvent({
    actorId: gate.session.user.id,
    action: "staff.invited",
    entityType: "profile",
    entityId: userId,
    metadata: {
      email,
      display_name: displayName,
      roles,
    },
  });

  redirectWithMessage(
    STAFF_PATH,
    "Invitation sent. They will choose their password and set up MFA before using the Hub.",
  );
}

const STAFF_EMAIL_COOLDOWN_MS = 90_000;

function resolveStaffRedirectTo(): string {
  try {
    return staffInviteRedirectTo();
  } catch (error) {
    redirectWithError(
      STAFF_PATH,
      error instanceof Error
        ? error.message
        : "The website address for invitations is not configured correctly.",
    );
  }
}

async function assertStaffEmailCooldown(input: {
  admin: ReturnType<typeof createSecretKeyClient>;
  action: "staff.invitation.resent" | "staff.password_reset.sent";
  userId: string;
}): Promise<void> {
  const { data, error } = await input.admin
    .from("audit_events")
    .select("created_at")
    .eq("action", input.action)
    .eq("entity_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.created_at) return;
  const last = Date.parse(data.created_at);
  if (Number.isNaN(last)) return;
  if (Date.now() - last < STAFF_EMAIL_COOLDOWN_MS) {
    redirectWithError(
      `${STAFF_PATH}?focus=${input.userId}`,
      "Please wait a moment before sending another email to this person.",
    );
  }
}

function isPendingAuthUser(user: {
  email_confirmed_at?: string | null;
  invited_at?: string | null;
  last_sign_in_at?: string | null;
}): boolean {
  if (!user.email_confirmed_at && user.invited_at) return true;
  if (user.invited_at && !user.last_sign_in_at) return true;
  return false;
}

/**
 * Pending invite resend: Auth Admin inviteUserByEmail again (SMTP via configured Resend).
 * Does not delete/recreate the Auth user. If GoTrue rejects re-invite for an existing
 * pending identity, falls back to resetPasswordForEmail so they can finish set-password
 * through the same /auth/confirm?next=/auth/set-password path.
 */
export async function resendStaffSetupEmail(formData: FormData) {
  const gate = await requireStaffAction("users.manage");
  if (!gate.ok) {
    redirectWithError(STAFF_PATH, gate.message);
  }

  const userId = emptyToNull(formData.get("user_id"));
  if (!userId) {
    redirectWithError(STAFF_PATH, "Missing staff member.");
  }

  const admin = createSecretKeyClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile?.email) {
    redirectWithError(STAFF_PATH, "That staff member could not be found.");
  }
  if (!profile.is_active) {
    redirectWithError(
      STAFF_PATH,
      "This account is disabled. Restore Hub access before resending setup email.",
    );
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    redirectWithError(STAFF_PATH, "That staff member could not be found.");
  }
  if (!isPendingAuthUser(authData.user)) {
    redirectWithError(
      `${STAFF_PATH}?focus=${userId}`,
      "This person already finished setup. Use Send password reset instead.",
    );
  }

  await assertStaffEmailCooldown({
    admin,
    action: "staff.invitation.resent",
    userId,
  });

  const redirectTo = resolveStaffRedirectTo();
  const email = normalizeEmail(profile.email);

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo },
  );

  let method: "inviteUserByEmail" | "resetPasswordForEmail" = "inviteUserByEmail";
  if (inviteError) {
    const message = inviteError.message?.toLowerCase() ?? "";
    const alreadyExists =
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists");
    if (!alreadyExists) {
      if (message.includes("rate") || message.includes("limit")) {
        redirectWithError(
          `${STAFF_PATH}?focus=${userId}`,
          "Please wait a moment before sending another email to this person.",
        );
      }
      redirectWithError(
        STAFF_PATH,
        "We could not resend the setup email right now. Please try again shortly.",
      );
    }

    // Safest supported equivalent that still emails via Auth SMTP and never deletes.
    const { error: recoveryError } = await admin.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );
    if (recoveryError) {
      redirectWithError(
        STAFF_PATH,
        "We could not resend the setup email right now. Please try again shortly.",
      );
    }
    method = "resetPasswordForEmail";
  }

  await writeAuditEvent({
    actorId: gate.session.user.id,
    action: "staff.invitation.resent",
    entityType: "profile",
    entityId: userId,
    metadata: {
      email,
      method,
    },
  });

  redirectWithMessage(`${STAFF_PATH}?focus=${userId}`, "Setup email sent.");
}

/**
 * Active staff password recovery: Auth resetPasswordForEmail (same path as
 * /auth/forgot-password) with canonical site redirect. Staff choose their own
 * password; this never sets a password administratively.
 */
export async function sendStaffPasswordReset(formData: FormData) {
  const gate = await requireStaffAction("users.manage");
  if (!gate.ok) {
    redirectWithError(STAFF_PATH, gate.message);
  }

  const userId = emptyToNull(formData.get("user_id"));
  if (!userId) {
    redirectWithError(STAFF_PATH, "Missing staff member.");
  }

  const admin = createSecretKeyClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile?.email) {
    redirectWithError(STAFF_PATH, "That staff member could not be found.");
  }
  if (!profile.is_active) {
    redirectWithError(
      STAFF_PATH,
      "This account is disabled. Restore Hub access before sending a password reset.",
    );
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    redirectWithError(STAFF_PATH, "That staff member could not be found.");
  }
  if (isPendingAuthUser(authData.user)) {
    redirectWithError(
      `${STAFF_PATH}?focus=${userId}`,
      "This person still has an invitation pending. Use Resend setup email instead.",
    );
  }

  await assertStaffEmailCooldown({
    admin,
    action: "staff.password_reset.sent",
    userId,
  });

  const redirectTo = resolveStaffRedirectTo();
  const email = normalizeEmail(profile.email);
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (message.includes("rate") || message.includes("limit")) {
      redirectWithError(
        `${STAFF_PATH}?focus=${userId}`,
        "Please wait a moment before sending another email to this person.",
      );
    }
    redirectWithError(
      STAFF_PATH,
      "We could not send the password reset email right now. Please try again shortly.",
    );
  }

  await writeAuditEvent({
    actorId: gate.session.user.id,
    action: "staff.password_reset.sent",
    entityType: "profile",
    entityId: userId,
    metadata: {
      email,
      method: "resetPasswordForEmail",
    },
  });

  redirectWithMessage(
    `${STAFF_PATH}?focus=${userId}`,
    "Password reset email sent.",
  );
}

export async function updateStaffAccess(formData: FormData) {
  const gate = await requireStaffAction("users.manage");
  if (!gate.ok) {
    redirectWithError(STAFF_PATH, gate.message);
  }

  const userId = emptyToNull(formData.get("user_id"));
  if (!userId) {
    redirectWithError(STAFF_PATH, "Missing staff member.");
  }

  const roles = parseAssignableRolesFromForm(formData);
  const confirmRemove = formData.get("confirm_remove_access") === "yes";
  const admin = createSecretKeyClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) {
    redirectWithError(STAFF_PATH, "That staff member could not be found.");
  }

  const existingRoles = await currentRolesForUser(admin, userId);
  const isSuperAdmin = existingRoles.includes("super_admin");

  if (isSuperAdmin && roles.length === 0) {
    redirectWithError(
      STAFF_PATH,
      "Super Admin accounts cannot have all access removed from this screen.",
    );
  }

  if (roles.length === 0) {
    if (!confirmRemove) {
      redirectWithError(
        `${STAFF_PATH}?focus=${userId}`,
        "To remove all Website, Care, Prayer and Finance access, tick the confirmation box first. Their sign-in account is kept.",
      );
    }
    if (userId === gate.session.user.id) {
      redirectWithError(
        STAFF_PATH,
        "You cannot disable your own Hub access from this screen.",
      );
    }

    try {
      await replaceAssignableRoles({
        admin,
        userId,
        nextAssignable: [],
        preserveSuperAdmin: isSuperAdmin,
      });
      const { error: disableError } = await admin
        .from("profiles")
        .update({ is_active: false })
        .eq("id", userId);
      if (disableError) throw new Error(disableError.message);
    } catch {
      redirectWithError(STAFF_PATH, "We could not update that person's access.");
    }

    await writeAuditEvent({
      actorId: gate.session.user.id,
      action: "staff.access.disabled",
      entityType: "profile",
      entityId: userId,
      metadata: {
        email: profile.email,
        previous_roles: existingRoles,
      },
    });

    redirectWithMessage(
      STAFF_PATH,
      "Hub access removed. Their account remains for history, but they cannot use the Hub.",
    );
  }

  try {
    const nextRoles = await replaceAssignableRoles({
      admin,
      userId,
      nextAssignable: roles,
      preserveSuperAdmin: isSuperAdmin,
    });
    if (!profile.is_active) {
      await admin.from("profiles").update({ is_active: true }).eq("id", userId);
    }

    await writeAuditEvent({
      actorId: gate.session.user.id,
      action: "staff.roles.updated",
      entityType: "profile",
      entityId: userId,
      metadata: {
        email: profile.email,
        previous_roles: existingRoles,
        roles: nextRoles,
      },
    });

    redirectWithMessage(
      `${STAFF_PATH}?focus=${userId}`,
      "Access updated.",
    );
  } catch {
    redirectWithError(STAFF_PATH, "We could not update that person's access.");
  }
}
