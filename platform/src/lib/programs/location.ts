/**
 * D1.8 program location kinds.
 * Shared by the Hub create wizard and the server action trust boundary.
 */

export const PROGRAM_LOCATION_KINDS = [
  "branch",
  "venue",
  "online",
  "hybrid",
] as const;

export type ProgramLocationKind = (typeof PROGRAM_LOCATION_KINDS)[number];

export function parseProgramLocationKind(
  value: unknown,
): ProgramLocationKind | null {
  return typeof value === "string" &&
    (PROGRAM_LOCATION_KINDS as readonly string[]).includes(value)
    ? (value as ProgramLocationKind)
    : null;
}
