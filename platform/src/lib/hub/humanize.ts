import type { Permission } from "@/lib/authorization/rbac";

const PERMISSION_HELP: Partial<Record<Permission, string>> = {
  "website.manage":
    "Your account is not allowed to change the public website. Ask a Super Admin for help.",
  "livestream.manage":
    "Your account is not allowed to change the livestream. Ask a Super Admin for help.",
  "media.manage":
    "Your account is not allowed to add or replace photos. Ask a Super Admin for help.",
  "programs.create":
    "Your account is not allowed to add programs. Ask a Super Admin for help.",
  "programs.update":
    "Your account is not allowed to change programs. Ask a Super Admin for help.",
  "programs.publish":
    "Your account can prepare programs, but cannot make them live. Ask someone who can publish.",
  "sermons.manage":
    "Your account is not allowed to change sermons. Ask a Super Admin for help.",
  "branches.manage":
    "Your account is not allowed to change this branch. Ask a Super Admin for help.",
  "hub.access":
    "Your account cannot open the Hub. Ask a Super Admin for help.",
  "audit.read":
    "Your account cannot view recent website changes. That is OK for most volunteers.",
  "giving.propose":
    "Your account is not allowed to propose Giving bank details. Ask a Finance reviewer or Super Admin.",
  "giving.approve":
    "Your account is not allowed to approve Giving bank details. Ask another Finance reviewer or Super Admin.",
  "prayer.read":
    "Your account cannot open Prayer requests. Ask a Pastoral Admin if you need Care access.",
  "counselling.read":
    "Your account cannot open Pastoral Care requests. Ask a Pastoral Admin if you need access.",
  "welfare.read":
    "Your account cannot open Welfare requests. Ask a Pastoral Admin if you need access.",
  "prayer.assign":
    "Your account cannot assign Prayer requests. Ask a Pastoral Admin.",
  "counselling.assign":
    "Your account cannot assign Pastoral Care requests. Ask a Pastoral Admin.",
  "welfare.assign":
    "Your account cannot assign Welfare requests. Ask a Pastoral Admin.",
  "users.manage":
    "Your account cannot manage Hub staff. Ask a Super Admin for help.",
};

export function humanPermissionDenied(permission: Permission): string {
  return (
    PERMISSION_HELP[permission] ??
    "Your account is not allowed to do this. Ask a Super Admin for help."
  );
}

export function humanAal2Required(): string {
  return "Please enter the 6-digit code from your authenticator app first. Then try this again.";
}

export function humanWebsiteValidationError(): string {
  return "Please fill in the new wording before making this live. Leave a box empty only if you want to keep the current website text.";
}

export function humanSignInError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "Sign-in took too long. Wait a moment and try again.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "That email or password is not right. Check both and try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "This staff account is not ready yet. Ask a Super Admin for help.";
  }
  return "We could not sign you in. Wait a moment and try again. If it still fails, ask a Super Admin for help.";
}

export function humanMfaError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid") ||
    lower.includes("expired") ||
    lower.includes("mismatch")
  ) {
    return "That 6-digit code is not right or has expired. Open your authenticator app for a new code and try again.";
  }
  if (lower.includes("timed out") || lower.includes("timeout")) {
    return "Checking the code took too long. Wait a moment and try again.";
  }
  if (lower.includes("already") && lower.includes("enroll")) {
    return "This authenticator app is already connected. Enter the 6-digit code from the app.";
  }
  return "We could not confirm the 6-digit code. Wait a moment and try again. If it still fails, ask a Super Admin for help.";
}

export function humanPasswordUpdateError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("session") || lower.includes("not authenticated")) {
    return "Your password link has expired. Request a new recovery email and try again.";
  }
  if (lower.includes("weak") || lower.includes("least") || lower.includes("short")) {
    return "That password is too short or too easy to guess. Choose a longer password.";
  }
  if (lower.includes("same") || lower.includes("different from the old")) {
    return "Choose a password that is different from your previous one.";
  }
  return "We could not save your password. Wait a moment and try again. If it still fails, ask a Super Admin for help.";
}

export function humanAuthNotice(
  notice: string | undefined | null,
): string | null {
  if (!notice) return null;
  switch (notice) {
    case "auth-link-invalid":
      return "That invite or recovery link is invalid or has expired. Request a new recovery email, or ask a Super Admin to resend an invite.";
    case "password-updated":
      return "Your password was saved. Sign in with your email and new password.";
    default:
      return null;
  }
}

/** Generic copy for resetPasswordForEmail — never reveal whether the email exists. */
export const FORGOT_PASSWORD_GENERIC_CONFIRMATION =
  "If an account exists for that email, a recovery link has been sent.";


export const HUB_AUDIT_ACTION_LABELS: Record<string, string> = {
  "website_document.update": "Website wording updated",
  "livestream.update": "Livestream updated",
  "program.publish": "Program made live",
  "program.archive": "Program removed from website",
  "program.cover_replace": "Program photo updated",
  "program.feature_home": "Homepage featured program updated",
  "sermon.publish": "Sermon made live",
  "sermon.archive": "Sermon removed from website",
  "media.upload": "Photo added",
  "media.archive": "Photo removed from library",
  "giving.proposal.create": "Giving change drafted",
  "giving.proposal.submit": "Giving change submitted for approval",
  "giving.proposal.withdraw": "Giving change returned to draft",
  "giving.proposal.reject": "Giving change rejected",
  "giving.proposal.approve": "Giving change approved and published to database",
  "giving.account.apply": "Giving destination applied in database",
  "care.request.received": "Care request received",
  "care.request.opened": "Care request opened",
  "care.request.assigned": "Care request assigned",
  "care.request.status_changed": "Care request status updated",
  "care.note.added": "Care note added",
  "care.request.closed": "Care request closed",
  "care.request.reopened": "Care request reopened",
};

export function humanAuditAction(action: string): string {
  return HUB_AUDIT_ACTION_LABELS[action] ?? "Website change";
}
