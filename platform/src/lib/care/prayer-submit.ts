import { createSecretKeyClient } from "@/lib/supabase/admin";
import { CARE_AUDIT_ACTIONS } from "@/lib/care/types";
import {
  isPrayerIntakeEnabled,
  validatePrayerSubmission,
  type PrayerSubmitInput,
} from "@/lib/care/prayer-intake";
import type { Json } from "@/lib/supabase/database.types";

export type PrayerSubmitResult =
  | { ok: true; referenceCode: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Controlled server-side Prayer insert.
 * Uses service-role client (BYPASSRLS) for insert only — never returns rows to the browser.
 * Fail closed when KCMI_PRAYER_INTAKE_ENABLED is not set.
 */
export async function submitPrayerRequest(raw: {
  narrative?: unknown;
  contactRequested?: unknown;
  displayName?: unknown;
  phone?: unknown;
  email?: unknown;
  company?: unknown;
}): Promise<PrayerSubmitResult> {
  if (!isPrayerIntakeEnabled()) {
    return {
      ok: false,
      message:
        "First-party Prayer intake is not enabled yet. Please use the Prayer form linked from Services.",
    };
  }

  const validated = validatePrayerSubmission(raw);
  if (!validated.ok) {
    return validated;
  }

  try {
    return await insertPrayerRequest(validated.data);
  } catch {
    return {
      ok: false,
      message:
        "We could not save your prayer request right now. Please try again in a moment.",
    };
  }
}

async function insertPrayerRequest(
  data: PrayerSubmitInput,
): Promise<PrayerSubmitResult> {
  const supabase = createSecretKeyClient();

  const { data: row, error } = await supabase
    .from("pastoral_requests")
    .insert({
      service_type: "prayer",
      status: "new",
      narrative: data.narrative,
      contact_requested: data.contactRequested,
      display_name: data.displayName,
      phone: data.phone,
      email: data.email,
      preferred_contact_method: data.contactRequested ? "phone" : null,
      preferred_contact_timing: null,
      branch_id: null,
      assigned_to: null,
    })
    .select("id, reference_code")
    .single();

  if (error || !row) {
    return {
      ok: false,
      message:
        "We could not save your prayer request right now. Please try again in a moment.",
    };
  }

  // Audit without PII/narrative. actor_id null for public intake.
  // Notification failure must never undo a successful insert — audit is best-effort.
  try {
    await supabase.from("audit_events").insert({
      actor_id: null,
      action: CARE_AUDIT_ACTIONS.received,
      entity_type: "pastoral_request",
      entity_id: row.id,
      metadata: {
        service_type: "prayer",
        reference_code: row.reference_code,
      } as Json,
    });
  } catch {
    // Intentional: request already stored.
  }

  return { ok: true, referenceCode: row.reference_code };
}
