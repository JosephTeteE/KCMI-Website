"use server";

import { submitPastoralRequest } from "@/lib/care/pastoral-submit";

export type PastoralActionState = {
  ok: boolean;
  message: string;
  referenceCode?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitPastoralAction(
  _prev: PastoralActionState | null,
  formData: FormData,
): Promise<PastoralActionState> {
  const result = await submitPastoralRequest({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    reason: formData.get("reason"),
    preferredMethod: formData.get("preferredMethod"),
    preferredTime: formData.get("preferredTime"),
    additional: formData.get("additional"),
    company: formData.get("company"),
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    ok: true,
    message: "Pastoral Care request received.",
    referenceCode: result.referenceCode,
  };
}
