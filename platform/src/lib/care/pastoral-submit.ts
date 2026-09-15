import { createSecretKeyClient } from "@/lib/supabase/admin";
import { CARE_AUDIT_ACTIONS } from "@/lib/care/types";
import {
  isPastoralIntakeEnabled,
  validatePastoralSubmission,
  type PastoralSubmitInput,
} from "@/lib/care/pastoral-intake";
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

export type PastoralSubmitResult =
  | { ok: true; referenceCode: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Controlled server-side Pastoral Care insert.
 * Fail closed when KCMI_PASTORAL_INTAKE_ENABLED is not set.
 */
export async function submitPastoralRequest(raw: {
  displayName?: unknown;
  phone?: unknown;
  email?: unknown;
  reason?: unknown;
  preferredMethod?: unknown;
  preferredTime?: unknown;
  additional?: unknown;
  company?: unknown;
}): Promise<PastoralSubmitResult> {
  if (!isPastoralIntakeEnabled()) {
    logCareIntakeEvent({ service: "pastoral", outcome: "gate_disabled" });
    return {
      ok: false,
      message:
        "First-party Pastoral Care intake is not enabled yet. Please use the Pastoral Care form linked from Services.",
    };
  }

  if (isCareIntakeHoneypotTriggered(raw.company)) {
    logCareIntakeEvent({
      service: "pastoral",
      outcome: "honeypot_rejected",
      code: "honeypot",
    });
    return { ok: false, message: CARE_INTAKE_GENERIC_REJECT_MESSAGE };
  }

  const rate = await consumeCareIntakeRateLimit("pastoral");
  if (!rate.allowed) {
    return { ok: false, message: CARE_INTAKE_RATE_LIMITED_MESSAGE };
  }

  const validated = validatePastoralSubmission(raw);
  if (!validated.ok) {
    logCareIntakeEvent({
      service: "pastoral",
      outcome: "validation_rejected",
      code: "validation",
    });
    return validated;
  }

  try {
    return await insertPastoralRequest(validated.data);
  } catch {
    logCareIntakeEvent({
      service: "pastoral",
      outcome: "insert_failed",
      code: "exception",
    });
    return {
      ok: false,
      message:
        "We could not save your Pastoral Care request right now. Please try again in a moment.",
    };
  }
}

async function insertPastoralRequest(
  data: PastoralSubmitInput,
): Promise<PastoralSubmitResult> {
  const supabase = createSecretKeyClient();

  const { data: row, error } = await supabase
    .from("pastoral_requests")
    .insert({
      service_type: "pastoral",
      status: "new",
      narrative: data.narrative,
      contact_requested: true,
      display_name: data.displayName,
      phone: data.phone,
      email: data.email,
      preferred_contact_method: data.preferredContactMethod,
      preferred_contact_timing: data.preferredContactTiming,
      request_category: null,
      branch_id: null,
      assigned_to: null,
    })
    .select("id, reference_code")
    .single();

  if (error || !row) {
    logCareIntakeEvent({
      service: "pastoral",
      outcome: "insert_failed",
      code: error?.code ?? "no_row",
    });
    return {
      ok: false,
      message:
        "We could not save your Pastoral Care request right now. Please try again in a moment.",
    };
  }

  try {
    await supabase.from("audit_events").insert({
      actor_id: null,
      action: CARE_AUDIT_ACTIONS.received,
      entity_type: "pastoral_request",
      entity_id: row.id,
      metadata: {
        service_type: "pastoral",
        reference_code: row.reference_code,
      } as Json,
    });
  } catch {
    // Intentional: request already stored.
  }

  logCareIntakeEvent({
    service: "pastoral",
    outcome: "accepted",
    referenceCode: row.reference_code,
  });

  return { ok: true, referenceCode: row.reference_code };
}
