/**
 * Livestream effective live state (read-time).
 *
 * Timezone contract:
 * - Hub volunteers enter optional auto-end as Nigeria-local (Africa/Lagos) date + 12-hour time.
 * - Stored as UTC `timestamptz` (`auto_end_at`).
 * - Public effective live: is_live === true AND (auto_end_at is null OR now < auto_end_at).
 * - Manual Off sets is_live false immediately (auto_end_at cleared).
 */

import { DEFAULT_PROGRAM_TIMEZONE } from "@/lib/programs/sessions";

export const LIVESTREAM_AUTO_END_TIMEZONE = DEFAULT_PROGRAM_TIMEZONE; // Africa/Lagos

export function effectiveLivestreamIsLive(input: {
  isLive: boolean;
  autoEndAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (!input.isLive) return false;
  if (!input.autoEndAt) return true;
  const endMs = new Date(input.autoEndAt).getTime();
  if (Number.isNaN(endMs)) return true;
  const nowMs = (input.now ?? new Date()).getTime();
  return nowMs < endMs;
}
