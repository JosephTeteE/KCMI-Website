/** Pure helpers for the optional homepage Program Spotlight takeover. */

export type SpotlightFrequency = "once_per_browser" | "once_per_session";

export function spotlightStorageKey(
  programId: string,
  frequency: SpotlightFrequency,
): string {
  return `kcmi:spotlight:${frequency}:${programId}`;
}

export function withinSpotlightWindow(
  now: Date,
  windowStart?: string | null,
  windowEnd?: string | null,
): boolean {
  if (windowStart) {
    const start = Date.parse(windowStart);
    if (!Number.isNaN(start) && now.getTime() < start) return false;
  }
  if (windowEnd) {
    const end = Date.parse(windowEnd);
    if (!Number.isNaN(end) && now.getTime() > end) return false;
  }
  return true;
}

export function hasSeenSpotlight(
  store: Pick<Storage, "getItem"> | null,
  key: string,
): boolean {
  if (!store) return false;
  try {
    return store.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markSpotlightSeen(
  store: Pick<Storage, "setItem"> | null,
  key: string,
): void {
  if (!store) return;
  try {
    store.setItem(key, "1");
  } catch {
    // Ignore private-mode / blocked storage.
  }
}

export function shouldShowSpotlightTakeover(options: {
  enabled: boolean;
  programId: string | null | undefined;
  frequency: SpotlightFrequency;
  now?: Date;
  windowStart?: string | null;
  windowEnd?: string | null;
  storage: Pick<Storage, "getItem"> | null;
}): boolean {
  if (!options.enabled || !options.programId) return false;
  if (
    !withinSpotlightWindow(
      options.now ?? new Date(),
      options.windowStart,
      options.windowEnd,
    )
  ) {
    return false;
  }
  const key = spotlightStorageKey(options.programId, options.frequency);
  return !hasSeenSpotlight(options.storage, key);
}
