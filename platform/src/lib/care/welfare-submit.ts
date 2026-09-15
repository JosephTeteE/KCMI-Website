import { createSecretKeyClient } from "@/lib/supabase/admin";
import { CARE_AUDIT_ACTIONS } from "@/lib/care/types";
import {
  isWelfareIntakeEnabled,
  validateWelfareSubmission,
  type WelfareSubmitInput,
} from "@/lib/care/welfare-intake";
import type { Json } from "@/lib/supabase/database.types";

export type WelfareSubmitResult =
  | { ok: true; referenceCode: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Controlled server-side Welfare insert.
 * Uses service-role client (BYPASSRLS) for insert only — never returns rows to the browser.
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
    return {
      ok: false,
      message:
        "First-party Welfare intake is not enabled yet. Please use the Welfare form linked from Services.",
    };
  }

  const validated = validateWelfareSubmission(raw);
  if (!validated.ok) {
    return validated;
  }

  try {
    return await insertWelfareRequest(validated.data);
  } catch {
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

  return { ok: true, referenceCode: row.reference_code };
}
