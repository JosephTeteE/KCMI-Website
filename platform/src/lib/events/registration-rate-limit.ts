/**
 * Best-effort in-process rate limit for public Event registration.
 * Does not store raw IP. Key should be a short hash (event + email).
 */

const hits = new Map<string, number[]>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 8;

export function allowRegistrationAttempt(key: string, now = Date.now()): boolean {
  const cutoff = now - WINDOW_MS;
  const prior = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (prior.length >= MAX_HITS) {
    hits.set(key, prior);
    return false;
  }
  prior.push(now);
  hits.set(key, prior);
  return true;
}

/** Test helper — clears buckets between cases. */
export function resetRegistrationRateLimitForTests(): void {
  hits.clear();
}
