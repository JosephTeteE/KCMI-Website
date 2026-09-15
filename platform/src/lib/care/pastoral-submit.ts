import { createSecretKeyClient } from "@/lib/supabase/admin";
import { CARE_AUDIT_ACTIONS } from "@/lib/care/types";
import {
  isPastoralIntakeEnabled,
  validatePastoralSubmission,
  type PastoralSubmitInput,
} from "@/lib/care/pastoral-intake";
import type { Json } from "@/lib/supabase/database.types";

export type PastoralSubmitResult =
  | { ok: true; referenceCode: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Controlled server-side Pastoral Care insert.
 * Uses service-role client (BYPASSRLS) for insert only — never returns rows to the browser.
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
    return {
      ok: false,
      message:
        "First-party Pastoral Care intake is not enabled yet. Please use the Pastoral Care form linked from Services.",
    };
  }

  const validated = validatePastoralSubmission(raw);
  if (!validated.ok) {
    return validated;
  }

  try {
    return await insertPastoralRequest(validated.data);
  } catch {
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

  return { ok: true, referenceCode: row.reference_code };
}
