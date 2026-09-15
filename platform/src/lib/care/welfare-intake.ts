/**
 * First-party Welfare intake (Care P3).
 * HIGHLY_SENSITIVE narratives — never log payloads.
 * "Medical" is a support category only — not medical intake.
 */

import { z } from "zod";
import {
  WELFARE_REQUEST_CATEGORIES,
  type WelfareRequestCategory,
} from "@/lib/care/types";

/** Verified legacy Welfare Google Form — remains live CTA until HUMAN cutover. */
export const LEGACY_WELFARE_GOOGLE_FORM_URL =
  "https://forms.gle/NcScEq6WFDeBankw5";

/**
 * Server-only cutover gate.
 * HUMAN enables first-party intake by setting on the host:
 *   KCMI_WELFARE_INTAKE_ENABLED=1
 * then redeploying. Default (unset/0/false) → fail closed.
 */
export function isWelfareIntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.KCMI_WELFARE_INTAKE_ENABLED?.trim().toLowerCase();
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

export type WelfareSubmitInput = {
  narrative: string;
  displayName: string;
  phone: string;
  email: string | null;
  requestCategory: WelfareRequestCategory;
  contactRequested: true;
};

export type WelfareValidationResult =
  | { ok: true; data: WelfareSubmitInput }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function isWelfareCategory(value: string): value is WelfareRequestCategory {
  return (WELFARE_REQUEST_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Combine required description + optional additional into one narrative field.
 */
export function buildWelfareNarrative(
  description: string,
  additional: string | null,
): string {
  if (!additional) {
    return description;
  }
  return `${description}\n\n---\nAdditional information:\n${additional}`;
}

export function validateWelfareSubmission(raw: {
  displayName?: unknown;
  phone?: unknown;
  email?: unknown;
  category?: unknown;
  description?: unknown;
  additional?: unknown;
  /** Honeypot — must be empty if present. */
  company?: unknown;
}): WelfareValidationResult {
  if (typeof raw.company === "string" && raw.company.trim() !== "") {
    return { ok: false, message: "We could not accept that submission." };
  }

  const displayName = blankToNull(
    typeof raw.displayName === "string" ? raw.displayName : null,
  );
  const phone = blankToNull(typeof raw.phone === "string" ? raw.phone : null);
  const email = blankToNull(typeof raw.email === "string" ? raw.email : null);
  const categoryRaw =
    typeof raw.category === "string" ? raw.category.trim().toLowerCase() : "";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
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

  if (!isWelfareCategory(categoryRaw)) {
    fieldErrors.category = "Choose a type of request.";
  }

  if (description.length < 1) {
    fieldErrors.description = "Required";
  } else if (description.length > 6000) {
    fieldErrors.description = "Too long";
  }

  if (additional && additional.length > 2000) {
    fieldErrors.additional = "Too long";
  }

  const narrative = buildWelfareNarrative(description, additional);
  if (narrative.length > 8000) {
    fieldErrors.description = "That request is too long. Please shorten it.";
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
      requestCategory: categoryRaw as WelfareRequestCategory,
      contactRequested: true,
    },
  };
}

/** Locations that still point at Google Forms (do not change in P3). */
export const WELFARE_GOOGLE_FORM_CUTOVER_LOCATIONS = [
  "/services care section — Welfare request form link",
  "Legacy Connect / care links on static public HTML (if still served)",
] as const;
