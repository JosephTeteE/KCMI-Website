import { createSecretKeyClient } from "@/lib/supabase/admin";
import {
  isWebsiteRequestHoneypotTriggered,
  WEBSITE_REQUEST_GENERIC_REJECT_MESSAGE,
} from "@/lib/requests/abuse";
import { logWebsiteRequestIntakeEvent } from "@/lib/requests/intake-log";
import { notifyWebsiteRequestReceived } from "@/lib/requests/notify";
import {
  consumeWebsiteRequestRateLimit,
  WEBSITE_REQUEST_RATE_LIMITED_MESSAGE,
} from "@/lib/requests/rate-limit";
import { validateWebsiteRequestSubmission } from "@/lib/requests/validate";
import type { WebsiteRequestEmailStatus } from "@/lib/requests/types";

export type WebsiteRequestSubmitResult =
  | { ok: true; referenceCode: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Controlled server-side website Contact insert.
 * DB is system of record. Email runs only after successful persistence.
 */
export async function submitWebsiteRequest(raw: {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  topic?: unknown;
  message?: unknown;
  source?: unknown;
  company?: unknown;
}): Promise<WebsiteRequestSubmitResult> {
  if (isWebsiteRequestHoneypotTriggered(raw.company)) {
    logWebsiteRequestIntakeEvent({
      outcome: "honeypot_rejected",
      code: "honeypot",
    });
    return { ok: false, message: WEBSITE_REQUEST_GENERIC_REJECT_MESSAGE };
  }

  const rate = await consumeWebsiteRequestRateLimit();
  if (!rate.allowed) {
    return { ok: false, message: WEBSITE_REQUEST_RATE_LIMITED_MESSAGE };
  }

  const validated = validateWebsiteRequestSubmission(raw);
  if (!validated.ok) {
    logWebsiteRequestIntakeEvent({
      outcome: "validation_rejected",
      code: "validation",
    });
    return validated;
  }

  const data = validated.data;
  let inserted: {
    id: string;
    reference_code: string;
  } | null = null;

  try {
    const supabase = createSecretKeyClient();
    const { data: row, error } = await supabase
      .from("website_requests")
      .insert({
        topic: data.topic,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        message: data.message,
        source: data.source,
        status: "new",
        assigned_to: null,
        email_notification_status: "pending",
      })
      .select("id, reference_code")
      .single();

    if (error || !row) {
      logWebsiteRequestIntakeEvent({
        outcome: "insert_failed",
        code: error?.code ?? "no_row",
      });
      return {
        ok: false,
        message:
          "We could not save your message right now. Please try again in a moment.",
      };
    }
    inserted = row;
  } catch {
    logWebsiteRequestIntakeEvent({
      outcome: "insert_failed",
      code: "exception",
    });
    return {
      ok: false,
      message:
        "We could not save your message right now. Please try again in a moment.",
    };
  }

  const notify = await notifyWebsiteRequestReceived({
    id: inserted.id,
    referenceCode: inserted.reference_code,
    topic: data.topic,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    message: data.message,
    source: data.source,
  });

  let emailStatus: WebsiteRequestEmailStatus = "pending";
  let emailNotifiedAt: string | null = null;
  if (notify.status === "sent") {
    emailStatus = "sent";
    emailNotifiedAt = new Date().toISOString();
  } else if (notify.status === "skipped") {
    emailStatus = "skipped";
  } else {
    emailStatus = "failed";
  }

  try {
    const supabase = createSecretKeyClient();
    await supabase
      .from("website_requests")
      .update({
        email_notification_status: emailStatus,
        email_notified_at: emailNotifiedAt,
      })
      .eq("id", inserted.id);
  } catch {
    // Request already stored — email status update is best-effort.
  }

  logWebsiteRequestIntakeEvent({
    outcome: "accepted",
    referenceCode: inserted.reference_code,
  });

  return { ok: true, referenceCode: inserted.reference_code };
}
