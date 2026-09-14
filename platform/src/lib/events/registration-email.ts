/**
 * Optional Resend confirmation for Event registrations (E3).
 * Registration succeeds even when email is not configured or send fails.
 */

export type RegistrationEmailInput = {
  to: string;
  registrantName: string;
  eventTitle: string;
  eventDatesLabel: string;
  partySize: number;
  referenceCode: string;
  eventUrl: string;
};

export type RegistrationEmailResult =
  | { ok: true; id?: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; reason: string };

export async function sendRegistrationConfirmationEmail(
  input: RegistrationEmailInput,
): Promise<RegistrationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return {
      ok: false,
      skipped: true,
      reason: "RESEND_API_KEY or RESEND_FROM_EMAIL is not configured",
    };
  }

  const subject = `Registration received — ${input.eventTitle}`;
  const text = [
    `Hello ${input.registrantName},`,
    "",
    `We received your registration for ${input.eventTitle}.`,
    `When: ${input.eventDatesLabel}`,
    `People registered: ${input.partySize}`,
    `Reference: ${input.referenceCode}`,
    "",
    `Event page: ${input.eventUrl}`,
    "",
    "Please keep this reference for your records.",
    "",
    "Kingdom Covenant Ministries International",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        text,
      }),
    });
    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        reason: `Resend HTTP ${response.status}`,
      };
    }
    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : "email send failed",
    };
  }
}
