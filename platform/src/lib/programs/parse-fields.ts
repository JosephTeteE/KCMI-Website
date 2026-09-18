/**
 * D1.8 program form parsing (create wizard + legacy edit).
 * Kept outside "use server" so unit tests can import it directly.
 */

import { validateCtaUrl } from "@/lib/cms/cta-url";
import {
  parseProgramActionKind,
  validateProgramActionUrl,
} from "@/lib/programs/action-url";
import {
  legacyIntervalFromSessions,
  parseProgramSessionsJson,
  parseProgramTimezone,
  type ParsedProgramSession,
} from "@/lib/programs/sessions";
import { programActionLabel } from "@/lib/programs/schedule";
import type { ProgramActionKind } from "@/lib/programs/schedule";
import {
  parseProgramLocationKind,
  type ProgramLocationKind,
} from "@/lib/programs/location";
import type { Database } from "@/lib/supabase/database.types";

type ProgramPlacement = Database["public"]["Enums"]["program_placement"];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLACEMENTS = new Set<ProgramPlacement>([
  "none",
  "featured",
  "banner",
  "card",
]);

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

function parseUuid(value: FormDataEntryValue | null): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;
  return UUID_PATTERN.test(raw) ? raw : null;
}

function parseOptionalIso(value: FormDataEntryValue | null): string | null {
  const raw = emptyToNull(value);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parsePlacement(value: FormDataEntryValue | null): ProgramPlacement {
  const raw = typeof value === "string" ? value : "none";
  return PLACEMENTS.has(raw as ProgramPlacement)
    ? (raw as ProgramPlacement)
    : "none";
}

export type ParsedProgramFields = {
  title: string;
  short_description: string;
  body_text: string;
  starts_at: string | null;
  ends_at: string | null;
  featured_media_id: string | null;
  cta_label: string | null;
  cta_url: string | null;
  placement: ProgramPlacement;
  action_kind: ProgramActionKind;
  location_kind: ProgramLocationKind | null;
  location_branch_id: string | null;
  location_label: string | null;
  timezone: string;
  sessions: ParsedProgramSession[];
  /** True when the create wizard (or an editor that posts sessions) is the source. */
  hasSessionPayload: boolean;
  hasActionKindPayload: boolean;
  hasLocationPayload: boolean;
};

/**
 * Server-side trust boundary for program create/update forms.
 * Create wizard posts action_kind + sessions_json; legacy edit may omit them.
 */
export function parseProgramFields(
  formData: FormData,
  options: { forcePlacementNone?: boolean } = {},
): { ok: true; fields: ParsedProgramFields } | { ok: false; error: string } {
  const title = emptyToNull(formData.get("title"));
  if (!title) {
    return { ok: false, error: "Please enter a program name." };
  }

  const hasActionKindPayload = formData.has("action_kind");
  const action_kind = hasActionKindPayload
    ? parseProgramActionKind(formData.get("action_kind"))
    : "none";

  let cta_label: string | null;
  let cta_url: string | null;

  if (hasActionKindPayload) {
    const actionUrl = validateProgramActionUrl(
      action_kind,
      emptyToNull(formData.get("cta_url")),
    );
    if (!actionUrl.ok) {
      return { ok: false, error: actionUrl.error };
    }
    cta_url = actionUrl.url;
    cta_label = programActionLabel(action_kind);
  } else {
    const cta = validateCtaUrl(emptyToNull(formData.get("cta_url")));
    if (!cta.ok) {
      return { ok: false, error: cta.error };
    }
    cta_url = cta.url;
    cta_label = emptyToNull(formData.get("cta_label"));
  }

  const sessionsParsed = parseProgramSessionsJson(formData.get("sessions_json"));
  if (!sessionsParsed.ok) {
    return { ok: false, error: sessionsParsed.error };
  }
  const sessionsRaw = formData.get("sessions_json");
  const hasSessionPayload =
    typeof sessionsRaw === "string" && sessionsRaw.trim().length > 0;

  const timezone = parseProgramTimezone(formData.get("timezone"));
  let starts_at = parseOptionalIso(formData.get("starts_at"));
  let ends_at = parseOptionalIso(formData.get("ends_at"));

  // Empty sessions_json ("[]") is a valid "no schedule" choice — do not invent dates.
  if (hasSessionPayload && sessionsParsed.sessions.length > 0) {
    for (const session of sessionsParsed.sessions) {
      if (!session.start_time) {
        return {
          ok: false,
          error: "Every session needs a start time.",
        };
      }
    }
    const legacy = legacyIntervalFromSessions(sessionsParsed.sessions, timezone);
    starts_at = legacy.startsAt;
    ends_at = legacy.endsAt;
  } else if (hasSessionPayload) {
    starts_at = null;
    ends_at = null;
  }

  const hasLocationPayload = formData.has("location_kind");
  let location_kind: ProgramLocationKind | null = null;
  let location_branch_id: string | null = null;
  let location_label: string | null = null;

  if (hasLocationPayload) {
    location_kind = parseProgramLocationKind(formData.get("location_kind"));
    if (!location_kind) {
      return {
        ok: false,
        error: "Choose where this program happens.",
      };
    }
    location_branch_id = parseUuid(formData.get("location_branch_id"));
    location_label = emptyToNull(formData.get("location_label"));

    if (location_kind === "branch") {
      if (!location_branch_id) {
        return { ok: false, error: "Choose a KCMI branch." };
      }
      location_label = null;
    } else if (location_kind === "venue" || location_kind === "hybrid") {
      if (!location_label) {
        return {
          ok: false,
          error:
            location_kind === "hybrid"
              ? "Enter the place name for the in-person part."
              : "Enter the venue name.",
        };
      }
      location_branch_id = null;
    } else if (location_kind === "online") {
      location_branch_id = null;
      if (!location_label) {
        location_label = "Online";
      }
    }
  }

  return {
    ok: true,
    fields: {
      title,
      short_description: emptyToNull(formData.get("short_description")) ?? "",
      body_text: emptyToNull(formData.get("body_text")) ?? "",
      starts_at,
      ends_at,
      featured_media_id: parseUuid(formData.get("featured_media_id")),
      cta_label,
      cta_url,
      placement: options.forcePlacementNone
        ? "none"
        : parsePlacement(formData.get("placement")),
      action_kind,
      location_kind,
      location_branch_id,
      location_label,
      timezone,
      sessions: sessionsParsed.sessions,
      hasSessionPayload,
      hasActionKindPayload,
      hasLocationPayload,
    },
  };
}
