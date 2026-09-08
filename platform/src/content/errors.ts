/**
 * Thrown when a configured content source (e.g. Supabase) fails.
 * Callers must not silently fall back to seed when the DB is configured.
 */
export class ContentSourceError extends Error {
  readonly source: string;
  readonly cause?: unknown;

  constructor(message: string, options?: { source?: string; cause?: unknown }) {
    super(message);
    this.name = "ContentSourceError";
    this.source = options?.source ?? "supabase";
    this.cause = options?.cause;
  }
}
