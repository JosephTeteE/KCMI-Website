import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type ContentRevisionEntityType =
  | "program"
  | "church_branch"
  | "sermon"
  | "livestream_settings"
  | "website_document";

export type SaveRevisionInput = {
  entityType: ContentRevisionEntityType;
  entityId: string;
  snapshot: Record<string, unknown>;
  changedBy: string;
  changeSummary?: string | null;
};

/**
 * Append the next content revision snapshot for an entity (no binaries/secrets).
 */
export async function saveRevision({
  entityType,
  entityId,
  snapshot,
  changedBy,
  changeSummary,
}: SaveRevisionInput): Promise<{ revisionNumber: number }> {
  const supabase = await createClient();

  const { data: latest, error: latestError } = await supabase
    .from("content_revisions")
    .select("revision_number")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error(`Failed to read revision number: ${latestError.message}`);
  }

  const revisionNumber = (latest?.revision_number ?? 0) + 1;

  const { error: insertError } = await supabase.from("content_revisions").insert({
    entity_type: entityType,
    entity_id: entityId,
    revision_number: revisionNumber,
    snapshot: snapshot as Json,
    changed_by: changedBy,
    change_summary: changeSummary ?? null,
  });

  if (insertError) {
    throw new Error(`Failed to save content revision: ${insertError.message}`);
  }

  return { revisionNumber };
}
