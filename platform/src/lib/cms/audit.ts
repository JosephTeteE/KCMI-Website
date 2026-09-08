import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type WriteAuditEventInput = {
  action: string;
  entityType: string;
  entityId: string;
  /** Caller must already have asserted AAL2 and pass the authenticated actor id. */
  actorId: string;
  metadata?: Record<string, unknown>;
};

/**
 * Persist a privileged-action audit row.
 * Does not call assertAal2 — callers (e.g. requireStaffAction) must enforce AAL2 first
 * and pass actorId from the verified session.
 */
export async function writeAuditEvent({
  action,
  entityType,
  entityId,
  actorId,
  metadata,
}: WriteAuditEventInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_events").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    actor_id: actorId,
    metadata: (metadata ?? {}) as Json,
  });

  if (error) {
    throw new Error(`Failed to write audit event: ${error.message}`);
  }
}
