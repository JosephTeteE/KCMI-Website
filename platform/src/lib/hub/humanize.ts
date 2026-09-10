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
};

export function humanAuditAction(action: string): string {
  return HUB_AUDIT_ACTION_LABELS[action] ?? "Website change";
}
