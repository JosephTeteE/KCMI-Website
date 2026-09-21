"use server";

import { submitWebsiteRequest } from "@/lib/requests/submit";

export type ContactActionState = {
  ok: boolean;
  message: string;
  referenceCode?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitContactAction(
  _prev: ContactActionState | null,
  formData: FormData,
): Promise<ContactActionState> {
  const result = await submitWebsiteRequest({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    topic: formData.get("topic"),
    message: formData.get("message"),
    source: formData.get("source"),
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
    message: "Your message has been received.",
    referenceCode: result.referenceCode,
  };
}
