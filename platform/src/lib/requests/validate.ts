import {
  isWebsiteRequestTopic,
  type WebsiteRequestTopic,
} from "@/lib/requests/types";

export type WebsiteRequestSubmitInput = {
  fullName: string;
  email: string;
  phone: string | null;
  topic: WebsiteRequestTopic;
  message: string;
  source: string;
};

export type ValidateWebsiteRequestResult =
  | { ok: true; data: WebsiteRequestSubmitInput }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s().-]{6,31}$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Server-side validation for public Contact submissions.
 * Never trusts client-only checks.
 */
export function validateWebsiteRequestSubmission(raw: {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  topic?: unknown;
  message?: unknown;
  source?: unknown;
}): ValidateWebsiteRequestResult {
  const fieldErrors: Record<string, string> = {};

  const fullName = asString(raw.fullName);
  if (fullName.length < 1 || fullName.length > 120) {
    fieldErrors.fullName = "Please enter your name.";
  }

  const email = asString(raw.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    fieldErrors.email = "Please enter a valid email address.";
  }

  const phoneRaw = asString(raw.phone);
  const phone = phoneRaw === "" ? null : phoneRaw;
  if (phone && (!PHONE_RE.test(phone) || phone.length > 32)) {
    fieldErrors.phone = "Please enter a valid phone number, or leave it blank.";
  }

  const topicRaw = asString(raw.topic);
  if (!isWebsiteRequestTopic(topicRaw)) {
    fieldErrors.topic = "Please choose a topic.";
  }

  const message = asString(raw.message);
  if (message.length < 1) {
    fieldErrors.message = "Please write a short message.";
  } else if (message.length > 4000) {
    fieldErrors.message = "That message is too long.";
  }

  let source = asString(raw.source) || "contact";
  if (source.length > 80) source = source.slice(0, 80);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please check the form and try again.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      fullName,
      email,
      phone,
      topic: topicRaw as WebsiteRequestTopic,
      message,
      source,
    },
  };
}
