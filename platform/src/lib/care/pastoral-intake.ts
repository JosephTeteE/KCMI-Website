/**
 * First-party Pastoral Care intake (Care P3).
 * HIGHLY_SENSITIVE narratives — never log payloads.
 * Public label: Pastoral Care (internal permissions remain counselling.*).
 */

import { z } from "zod";
import type { CareContactMethod } from "@/lib/care/types";

/** Verified legacy Counselling Google Form — remains live CTA until HUMAN cutover. */
export const LEGACY_PASTORAL_GOOGLE_FORM_URL =
  "https://forms.gle/L6DyfegmTCGHuSBk6";

/**
 * Server-only cutover gate.
 * HUMAN enables first-party intake by setting on the host:
 *   KCMI_PASTORAL_INTAKE_ENABLED=1
 * then redeploying. Default (unset/0/false) → fail closed.
 */
export function isPastoralIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.KCMI_PASTORAL_INTAKE_ENABLED?.trim().toLowerCase();
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

export const PASTORAL_PREFERRED_METHODS = ["in_person", "phone"] as const;
export type PastoralPreferredMethod = (typeof PASTORAL_PREFERRED_METHODS)[number];

export type PastoralSubmitInput = {
  narrative: string;
  displayName: string;
  phone: string;
  email: string | null;
  preferredContactMethod: Extract<CareContactMethod, "in_person" | "phone">;
  preferredContactTiming: string;
  contactRequested: true;
};

export type PastoralValidationResult =
  | { ok: true; data: PastoralSubmitInput }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function isPreferredMethod(value: string): value is PastoralPreferredMethod {
  return value === "in_person" || value === "phone";
}

/**
 * Combine required reason + optional additional into one narrative field.
 * Avoids a second uncontrolled HIGHLY_SENSITIVE text column.
 */
export function buildPastoralNarrative(
  reason: string,
  additional: string | null,
): string {
  if (!additional) {
    return reason;
  }
  return `${reason}\n\n---\nAdditional information:\n${additional}`;
}

export function validatePastoralSubmission(raw: {
  displayName?: unknown;
  phone?: unknown;
  email?: unknown;
  reason?: unknown;
  preferredMethod?: unknown;
  preferredTime?: unknown;
  additional?: unknown;
  /** Honeypot — must be empty if present. */
  company?: unknown;
}): PastoralValidationResult {
  if (typeof raw.company === "string" && raw.company.trim() !== "") {
    return { ok: false, message: "We could not accept that submission." };
  }

  const displayName = blankToNull(
    typeof raw.displayName === "string" ? raw.displayName : null,
  );
  const phone = blankToNull(typeof raw.phone === "string" ? raw.phone : null);
  const email = blankToNull(typeof raw.email === "string" ? raw.email : null);
  const reason =
    typeof raw.reason === "string" ? raw.reason.trim() : "";
  const preferredMethodRaw =
    typeof raw.preferredMethod === "string" ? raw.preferredMethod.trim() : "";
  const preferredTime =
    typeof raw.preferredTime === "string" ? raw.preferredTime.trim() : "";
  const additional = blankToNull(
    typeof raw.additional === "string" ? raw.additional : null,
  );

  const fieldErrors: Record<string, string> = {};

  if (!displayName) {
    fieldErrors.displayName = "Name is required.";
  } else if (displayName.length > 120) {
    fieldErrors.displayName = "Name is too long.";
  }

  if (!phone) {
    fieldErrors.phone = "Phone is required.";
  } else {
    const phoneParsed = phoneSchema.safeParse(phone);
    if (!phoneParsed.success) {
      fieldErrors.phone = "Enter a valid phone number.";
    }
  }

  if (email) {
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) {
      fieldErrors.email = "Enter a valid email address.";
    }
  }

  if (reason.length < 1) {
    fieldErrors.reason = "Required";
  } else if (reason.length > 6000) {
    fieldErrors.reason = "Too long";
  }

  if (!isPreferredMethod(preferredMethodRaw)) {
    fieldErrors.preferredMethod = "Choose in person or by phone.";
  }

  if (preferredTime.length < 1) {
    fieldErrors.preferredTime = "Required";
  } else if (preferredTime.length > 200) {
    fieldErrors.preferredTime = "Too long";
  }

  if (additional && additional.length > 2000) {
    fieldErrors.additional = "Too long";
  }

  const narrative = buildPastoralNarrative(reason, additional);
  if (narrative.length > 8000) {
    fieldErrors.reason = "That request is too long. Please shorten it.";
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
      narrative,
      displayName: displayName!,
      phone: phone!,
      email,
      preferredContactMethod: preferredMethodRaw as PastoralPreferredMethod,
      preferredContactTiming: preferredTime,
      contactRequested: true,
    },
  };
}

/** Locations that still point at Google Forms (do not change in P3). */
export const PASTORAL_GOOGLE_FORM_CUTOVER_LOCATIONS = [
  "/services care section — Counselling request form link",
  "Legacy Connect / care links on static public HTML (if still served)",
] as const;
