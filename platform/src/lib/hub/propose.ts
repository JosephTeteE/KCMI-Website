export function mergeProposedCopy<T extends Record<string, string>>(
  current: T,
  proposed: Partial<T>,
): T {
  const next = { ...current };
  for (const key of Object.keys(current) as (keyof T)[]) {
    const value = proposed[key];
    if (typeof value === "string" && value.trim().length > 0) {
      next[key] = value as T[keyof T];
    }
  }
  return next;
}

export function hasProposedCopy<T extends Record<string, string>>(
  proposed: Partial<T>,
): boolean {
  return Object.values(proposed).some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
}

export function emptyProposedCopy<T extends Record<string, string>>(
  current: T,
): T {
  const empty = { ...current };
  for (const key of Object.keys(current) as (keyof T)[]) {
    empty[key] = "" as T[keyof T];
  }
  return empty;
}
