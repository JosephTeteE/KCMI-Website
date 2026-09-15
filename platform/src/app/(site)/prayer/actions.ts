"use server";

import { submitPrayerRequest } from "@/lib/care/prayer-submit";

export type PrayerActionState = {
  ok: boolean;
  message: string;
  referenceCode?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitPrayerAction(
  _prev: PrayerActionState | null,
  formData: FormData,
): Promise<PrayerActionState> {
  const result = await submitPrayerRequest({
    narrative: formData.get("narrative"),
    contactRequested: formData.get("contactRequested"),
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
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
    message: "Prayer request received.",
    referenceCode: result.referenceCode,
  };
}
