import { createSecretKeyClient } from "@/lib/supabase/admin";
import { CARE_AUDIT_ACTIONS } from "@/lib/care/types";
import {
  isWelfareIntakeEnabled,
  validateWelfareSubmission,
  type WelfareSubmitInput,
} from "@/lib/care/welfare-intake";
import {
  CARE_INTAKE_GENERIC_REJECT_MESSAGE,
  isCareIntakeHoneypotTriggered,
} from "@/lib/care/intake-abuse";
import { logCareIntakeEvent } from "@/lib/care/intake-log";
import {
  CARE_INTAKE_RATE_LIMITED_MESSAGE,
  consumeCareIntakeRateLimit,
} from "@/lib/care/intake-rate-limit";
import type { Json } from "@/lib/supabase/database.types";

export type WelfareSubmitResult =
  | { ok: true; referenceCode: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Controlled server-side Welfare insert.
 * Fail closed when KCMI_WELFARE_INTAKE_ENABLED is not set.
 */
export async function submitWelfareRequest(raw: {
  displayName?: unknown;
  phone?: unknown;
  email?: unknown;
  category?: unknown;
  description?: unknown;
  additional?: unknown;
  company?: unknown;
}): Promise<WelfareSubmitResult> {
  if (!isWelfareIntakeEnabled()) {
    logCareIntakeEvent({ service: "welfare", outcome: "gate_disabled" });
    return {
      ok: false,
      message:
        "First-party Welfare intake is not enabled yet. Please use the Welfare form linked from Services.",
    };
  }

  if (isCareIntakeHoneypotTriggered(raw.company)) {
    logCareIntakeEvent({
      service: "welfare",
      outcome: "honeypot_rejected",
      code: "honeypot",
    });
    return { ok: false, message: CARE_INTAKE_GENERIC_REJECT_MESSAGE };
  }

  const rate = await consumeCareIntakeRateLimit("welfare");
  if (!rate.allowed) {
    return { ok: false, message: CARE_INTAKE_RATE_LIMITED_MESSAGE };
  }

  const validated = validateWelfareSubmission(raw);
  if (!validated.ok) {
    logCareIntakeEvent({
      service: "welfare",
      outcome: "validation_rejected",
      code: "validation",
    });
    return validated;
  }

  try {
    return await insertWelfareRequest(validated.data);
  } catch {
    logCareIntakeEvent({
      service: "welfare",
      outcome: "insert_failed",
      code: "exception",
    });
    return {
      ok: false,
      message:
        "We could not save your Welfare request right now. Please try again in a moment.",
    };
  }
}

async function insertWelfareRequest(
  data: WelfareSubmitInput,
): Promise<WelfareSubmitResult> {
  const supabase = createSecretKeyClient();

  const { data: row, error } = await supabase
    .from("pastoral_requests")
    .insert({
      service_type: "welfare",
      status: "new",
      narrative: data.narrative,
      contact_requested: true,
      display_name: data.displayName,
      phone: data.phone,
      email: data.email,
      preferred_contact_method: null,
      preferred_contact_timing: null,
      request_category: data.requestCategory,
      branch_id: null,
      assigned_to: null,
    })
    .select("id, reference_code")
    .single();

  if (error || !row) {
    logCareIntakeEvent({
      service: "welfare",
      outcome: "insert_failed",
      code: error?.code ?? "no_row",
    });
    return {
      ok: false,
      message:
        "We could not save your Welfare request right now. Please try again in a moment.",
    };
  }

  try {
    await supabase.from("audit_events").insert({
      actor_id: null,
      action: CARE_AUDIT_ACTIONS.received,
      entity_type: "pastoral_request",
      entity_id: row.id,
      metadata: {
        service_type: "welfare",
        reference_code: row.reference_code,
        request_category: data.requestCategory,
      } as Json,
    });
  } catch {
    // Intentional: request already stored.
  }

  logCareIntakeEvent({
    service: "welfare",
    outcome: "accepted",
    referenceCode: row.reference_code,
  });

  return { ok: true, referenceCode: row.reference_code };
}
