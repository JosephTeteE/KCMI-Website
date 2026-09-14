"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createSecretKeyClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { generateRegistrationReferenceCode } from "@/lib/events/reference-code";
import { parsePartySize } from "@/lib/events/registration-eligibility";
import { sendRegistrationConfirmationEmail } from "@/lib/events/registration-email";
import { allowRegistrationAttempt } from "@/lib/events/registration-rate-limit";
import { formatEventDateLabel } from "@/lib/events/format";
import { resolvePublicSiteUrl } from "@/lib/env";

export type RegisterForEventResult =
  | {
      ok: true;
      referenceCode: string;
      eventTitle: string;
      datesLabel: string;
      partySize: number;
      emailSent: boolean;
      duplicate: boolean;
    }
  | { ok: false; error: string; code?: string };

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function rateKey(eventId: string, email: string): string {
  return createHash("sha256")
    .update(`${eventId}:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
}

function mapDbError(message: string): { error: string; code: string } {
  if (message.includes("REGISTRATION_FULL")) {
    return {
      error: "Registration is full for this event.",
      code: "REGISTRATION_FULL",
    };
  }
  if (message.includes("REGISTRATION_CLOSED")) {
    return {
      error: "Registration for this event is closed.",
      code: "REGISTRATION_CLOSED",
    };
  }
  if (message.includes("REGISTRATION_NOT_OPEN")) {
    return {
      error: "Registration for this event is not open yet.",
      code: "REGISTRATION_NOT_OPEN",
    };
  }
  if (
    message.includes("REGISTRATION_DISABLED") ||
    message.includes("EVENT_NOT_OPEN")
  ) {
    return {
      error: "Registration is not available for this event.",
      code: "REGISTRATION_DISABLED",
    };
  }
  if (message.includes("INVALID_PARTY_SIZE")) {
    return {
      error: "Enter a valid number of people.",
      code: "INVALID_PARTY_SIZE",
    };
  }
  return {
    error: "We could not complete your registration. Please try again.",
    code: "UNKNOWN",
  };
}

/**
 * Public Event registration. Turnstile verified server-side; insert via
 * service-role SECURITY DEFINER function (no anon table INSERT).
 */
export async function registerForEvent(
  formData: FormData,
): Promise<RegisterForEventResult> {
  const eventId = emptyToNull(formData.get("event_id"));
  const fullName = emptyToNull(formData.get("full_name"));
  const email = emptyToNull(formData.get("email"));
  const phone = emptyToNull(formData.get("phone"));
  const turnstileToken =
    emptyToNull(formData.get("cf-turnstile-response")) ??
    emptyToNull(formData.get("turnstile_token"));
  const party = parsePartySize(formData.get("num_people"));

  if (!eventId) {
    return { ok: false, error: "Missing event.", code: "MISSING_EVENT" };
  }
  if (!fullName || fullName.length < 2) {
    return {
      ok: false,
      error: "Please enter your full name.",
      code: "INVALID_NAME",
    };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      error: "Please enter a valid email address.",
      code: "INVALID_EMAIL",
    };
  }
  if (!phone || phone.replace(/\s/g, "").length < 7) {
    return {
      ok: false,
      error: "Please enter a phone number we can reach.",
      code: "INVALID_PHONE",
    };
  }
  if (!party.ok) {
    return { ok: false, error: party.error, code: "INVALID_PARTY_SIZE" };
  }

  if (!allowRegistrationAttempt(rateKey(eventId, email))) {
    return {
      ok: false,
      error: "Too many attempts. Please wait a few minutes and try again.",
      code: "RATE_LIMIT",
    };
  }

  const headerStore = await headers();
  const remoteIp =
    headerStore.get("cf-connecting-ip") ??
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    undefined;

  const turnstile = await verifyTurnstileToken(turnstileToken ?? "", remoteIp);
  if (!turnstile.ok) {
    return {
      ok: false,
      error: "Please complete the security check and try again.",
      code: "TURNSTILE",
    };
  }

  const admin = createSecretKeyClient();

  const { data: eventRow, error: eventError } = await admin
    .from("events")
    .select(
      "id, title, slug, starts_at, ends_at, timezone, status, registration_enabled",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !eventRow) {
    return {
      ok: false,
      error: "That event could not be found.",
      code: "EVENT_NOT_FOUND",
    };
  }

  let referenceCode = generateRegistrationReferenceCode();
  let inserted: {
    reference_code: string;
    num_people: number;
    submitted_at: string;
  } | null = null;
  let duplicate = false;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await admin.rpc("admin_register_for_event", {
      p_event_id: eventId,
      p_full_name: fullName,
      p_email: email,
      p_phone: phone,
      p_num_people: party.value,
      p_reference_code: referenceCode,
    });

    if (!error && data) {
      const row = (Array.isArray(data) ? data[0] : data) as {
        reference_code: string;
        num_people: number;
        submitted_at: string;
      };
      inserted = row;
      // Same email within the short window returns the existing reference.
      if (row.reference_code !== referenceCode) {
        duplicate = true;
      }
      break;
    }

    const msg = error?.message ?? "";
    if (msg.toLowerCase().includes("unique") || msg.includes("reference")) {
      referenceCode = generateRegistrationReferenceCode();
      continue;
    }
    const mapped = mapDbError(msg);
    return { ok: false, error: mapped.error, code: mapped.code };
  }

  if (!inserted) {
    return {
      ok: false,
      error: "We could not complete your registration. Please try again.",
      code: "INSERT_FAILED",
    };
  }

  const datesLabel = formatEventDateLabel({
    startsAt: eventRow.starts_at,
    endsAt: eventRow.ends_at,
    timezone: eventRow.timezone,
  });
  const site = resolvePublicSiteUrl("http://localhost:3000");
  const eventUrl = `${site.replace(/\/$/, "")}/events/${eventRow.slug}`;

  let emailSent = false;
  if (!duplicate) {
    const emailResult = await sendRegistrationConfirmationEmail({
      to: email,
      registrantName: fullName,
      eventTitle: eventRow.title,
      eventDatesLabel: datesLabel || "See event page",
      partySize: inserted.num_people,
      referenceCode: inserted.reference_code,
      eventUrl,
    });
    emailSent = emailResult.ok === true;
  }

  return {
    ok: true,
    referenceCode: inserted.reference_code,
    eventTitle: eventRow.title,
    datesLabel: datesLabel || "",
    partySize: inserted.num_people,
    emailSent,
    duplicate,
  };
}
