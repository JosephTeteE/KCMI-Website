/**
 * Event slug policy (E2):
 * - Create / draft edits: slug derived from title; collisions get -2, -3, …
 * - Published / archived edits: slug is STABLE — title changes do not rewrite the public URL
 */

import { slugifyTitle } from "@/lib/cms/slugify";
import { createClient } from "@/lib/supabase/server";

export async function uniqueEventSlug(
  title: string,
  excludeId?: string,
): Promise<string> {
  const supabase = await createClient();
  const base = slugifyTitle(title);
  let candidate = base.length >= 2 ? base : `event-${base || "untitled"}`;
  if (candidate.length < 2) candidate = "event";

  for (let i = 0; i < 50; i += 1) {
    let query = supabase.from("events").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate.slice(0, 80);
    candidate = `${base}-${i + 2}`.slice(0, 80);
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`.slice(0, 80);
}

export function shouldRegenerateEventSlug(status: string): boolean {
  return status === "draft" || status === "preview";
}
