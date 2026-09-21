/**
 * Server-only Resend notification for website Contact submissions.
 * Never import from Client Components.
 */

import { getServerEnv } from "@/lib/env/server";
import { logWebsiteRequestIntakeEvent } from "@/lib/requests/intake-log";
import {
  WEBSITE_REQUEST_TOPIC_LABELS,
  type WebsiteRequestTopic,
} from "@/lib/requests/types";

const DEFAULT_FROM = "KCMI Website <no-reply@auth.kcmi-rcc.org>";
const DEFAULT_TO = "contact@kcmi-rcc.org";

export type NotifyWebsiteRequestInput = {
  id: string;
  referenceCode: string;
  topic: WebsiteRequestTopic;
  fullName: string;
  email: string;
  phone: string | null;
  message: string;
  source: string;
};

export type NotifyWebsiteRequestResult =
  | { ok: true; status: "sent" }
  | { ok: true; status: "skipped"; reason: string }
  | { ok: false; status: "failed"; reason: string };

function hubDetailUrl(requestId: string): string {
  const base =
    getServerEnv().NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.kcmi-rcc.org";
  return `${base}/admin/requests/${requestId}`;
}

function escapeText(value: string): string {
  return value.replace(/\r\n/g, "\n").slice(0, 4000);
}

/**
 * Send staff notification after DB persistence.
 * Missing API key → skipped (request remains in Hub).
 */
export async function notifyWebsiteRequestReceived(
  input: NotifyWebsiteRequestInput,
): Promise<NotifyWebsiteRequestResult> {
  const env = getServerEnv();
  const apiKey = env.RESEND_API_KEY?.trim();
  const to = env.KCMI_CONTACT_NOTIFICATION_TO?.trim() || DEFAULT_TO;
  const from = env.KCMI_CONTACT_NOTIFICATION_FROM?.trim() || DEFAULT_FROM;

  if (!apiKey) {
    logWebsiteRequestIntakeEvent({
      outcome: "email_skipped",
      code: "missing_api_key",
      referenceCode: input.referenceCode,
    });
    return { ok: true, status: "skipped", reason: "missing_api_key" };
  }

  const topicLabel = WEBSITE_REQUEST_TOPIC_LABELS[input.topic];
  const preview = escapeText(input.message).slice(0, 400);
  const detailUrl = hubDetailUrl(input.id);

  const text = [
    `New website message (${input.referenceCode})`,
    "",
    `Topic: ${topicLabel}`,
    `From: ${escapeText(input.fullName)} <${escapeText(input.email)}>`,
    input.phone ? `Phone: ${escapeText(input.phone)}` : null,
    `Source: ${escapeText(input.source)}`,
    "",
    "Message:",
    preview,
    input.message.length > 400 ? "…" : null,
    "",
    `Open in Hub: ${detailUrl}`,
    "",
    "Reply to this email to respond to the visitor (Reply-To is set).",
  ]
    .filter((line) => line !== null)
    .join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `[KCMI] ${topicLabel} — ${input.referenceCode}`,
        text,
      }),
    });

    if (!response.ok) {
      logWebsiteRequestIntakeEvent({
        outcome: "email_failed",
        code: `http_${response.status}`,
        referenceCode: input.referenceCode,
      });
      return { ok: false, status: "failed", reason: `http_${response.status}` };
    }

    logWebsiteRequestIntakeEvent({
      outcome: "email_sent",
      referenceCode: input.referenceCode,
    });
    return { ok: true, status: "sent" };
  } catch {
    logWebsiteRequestIntakeEvent({
      outcome: "email_failed",
      code: "network",
      referenceCode: input.referenceCode,
    });
    return { ok: false, status: "failed", reason: "network" };
  }
}
