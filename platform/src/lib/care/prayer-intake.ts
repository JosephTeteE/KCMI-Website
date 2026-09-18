/**
 * First-party Prayer intake (Care P2).
 * HIGHLY_SENSITIVE narratives — never log payloads.
 */

import { z } from "zod";

/**
 * Server-only cutover gate.
 * HUMAN enables first-party intake by setting on the host:
 *   KCMI_PRAYER_INTAKE_ENABLED=1
 * then redeploying. Default (unset/0/false) → fail closed.
 * Gate-off UI must contact /contact — never Google Forms.
 */
export function isPrayerIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.KCMI_PRAYER_INTAKE_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,32}$/, "Enter a valid phone number.");

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254);

export type PrayerSubmitInput = {
  narrative: string;
  contactRequested: boolean;
  displayName: string | null;
  phone: string | null;
  email: string | null;
};

export type PrayerValidationResult =
  | { ok: true; data: PrayerSubmitInput }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Server-side Prayer field rules (do not rely on UI alone).
 * Anonymous allowed only when contactRequested is false.
 */
export function validatePrayerSubmission(raw: {
  narrative?: unknown;
  contactRequested?: unknown;
  displayName?: unknown;
  phone?: unknown;
  email?: unknown;
  /** Honeypot — must be empty if present. */
  company?: unknown;
}): PrayerValidationResult {
  if (typeof raw.company === "string" && raw.company.trim() !== "") {
    return { ok: false, message: "We could not accept that submission." };
  }

  const narrativeRaw =
    typeof raw.narrative === "string" ? raw.narrative.trim() : "";
  if (narrativeRaw.length < 1) {
    return {
      ok: false,
      message: "Please share your prayer request.",
      fieldErrors: { narrative: "Required" },
    };
  }
  if (narrativeRaw.length > 8000) {
    return {
      ok: false,
      message: "That prayer request is too long. Please shorten it.",
      fieldErrors: { narrative: "Too long" },
    };
  }

  const contactRequested =
    raw.contactRequested === true ||
    raw.contactRequested === "true" ||
    raw.contactRequested === "yes" ||
    raw.contactRequested === "Yes";

  const contactExplicitNo =
    raw.contactRequested === false ||
    raw.contactRequested === "false" ||
    raw.contactRequested === "no" ||
    raw.contactRequested === "No";

  if (!contactRequested && !contactExplicitNo) {
    return {
      ok: false,
      message: "Please choose whether you would like a prayer call.",
      fieldErrors: { contactRequested: "Required" },
    };
  }

  const displayName = blankToNull(
    typeof raw.displayName === "string" ? raw.displayName : null,
  );
  const phone = blankToNull(typeof raw.phone === "string" ? raw.phone : null);
  const email = blankToNull(typeof raw.email === "string" ? raw.email : null);

  const fieldErrors: Record<string, string> = {};

  if (contactRequested) {
    if (!displayName) {
      fieldErrors.displayName = "Name is required for a prayer call.";
    } else if (displayName.length > 120) {
      fieldErrors.displayName = "Name is too long.";
    }
    if (!phone) {
      fieldErrors.phone = "Phone is required for a prayer call.";
    } else {
      const phoneParsed = phoneSchema.safeParse(phone);
      if (!phoneParsed.success) {
        fieldErrors.phone = "Enter a valid phone number.";
      }
    }
  } else {
    if (displayName && displayName.length > 120) {
      fieldErrors.displayName = "Name is too long.";
    }
    if (phone) {
      const phoneParsed = phoneSchema.safeParse(phone);
      if (!phoneParsed.success) {
        fieldErrors.phone = "Enter a valid phone number.";
      }
    }
  }

  if (email) {
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) {
      fieldErrors.email = "Enter a valid email address.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      narrative: narrativeRaw,
      contactRequested,
      displayName: contactRequested ? displayName : displayName,
      phone: contactRequested ? phone : phone,
      email,
    },
  };
}

/** Historical notes only — public runtime must not use Google Forms. */
export const PRAYER_NATIVE_ENTRYPOINTS = [
  "Homepage Prayer CTA → /prayer",
  "/services care section → /prayer",
  "/faqs prayer answer → /prayer",
] as const;
