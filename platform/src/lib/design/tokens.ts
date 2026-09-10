/**
 * Authoritative KCMI brand primitives + semantic token names.
 * Keep in sync with src/styles/tokens.css — do not invent brand colors.
 */

export const brandPrimitives = {
  offWhite: "#eff5f5",
  red: "#b60b13",
  green: "#108c1d",
  lavender: "#c298b7",
  violet: "#7c1963",
} as const;

export const semanticTokenNames = [
  "surface-page",
  "surface-elevated",
  "surface-tint",
  "surface-brand",
  "action-primary",
  "action-primary-fg",
  "action-secondary",
  "action-secondary-fg",
  "accent",
  "accent-fg",
  "support",
  "text-support",
  "text-body",
  "text-muted",
  "text-on-brand",
  "border",
  "focus",
  "success",
  "success-bg",
  "warning",
  "warning-bg",
  "destructive",
  "destructive-fg",
] as const;

export type SemanticTokenName = (typeof semanticTokenNames)[number];

/** Contrast guidance recorded for implementers (ARCHITECTURE_V1). */
export const contrastNotes = {
  red: "Use with light/white text on red surfaces.",
  violet: "Use with light/white text on violet surfaces.",
  lavender: "Requires dark text for ordinary readable content.",
  green:
    "Do not automatically pair brand green (#108c1d) with white for normal-size text; use --color-text-support for text on pale surfaces.",
} as const;
