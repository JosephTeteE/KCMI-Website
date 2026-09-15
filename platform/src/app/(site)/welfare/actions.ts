"use server";

import { submitWelfareRequest } from "@/lib/care/welfare-submit";

export type WelfareActionState = {
  ok: boolean;
  message: string;
  referenceCode?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitWelfareAction(
  _prev: WelfareActionState | null,
  formData: FormData,
): Promise<WelfareActionState> {
  const result = await submitWelfareRequest({
    displayName: formData.get("displayName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    category: formData.get("category"),
    description: formData.get("description"),
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
    message: "Welfare request received.",
    referenceCode: result.referenceCode,
  };
}
