/**
 * KCMI QA1 — shared types for the full-spectrum harness.
 */

export type MutationClass =
  | "SAFE"
  | "NAVIGATION"
  | "LOCAL_STATE"
  | "DRAFT_WRITE"
  | "PUBLIC_WRITE"
  | "DESTRUCTIVE"
  | "EXTERNAL";

export type SurfaceClass =
  | "PUBLIC"
  | "HUB"
  | "AUTH"
  | "QA_ONLY"
  | "REDIRECT"
  | "FUTURE_STUB";

export type AuthRequirement = "none" | "staff" | "aal2";

export type QaRouteEntry = {
  path: string;
  surface: SurfaceClass;
  landmark?: RegExp | string;
  auth: AuthRequirement;
  roles?: string[];
  keyControls?: string[];
  viewports?: Array<"390" | "768" | "1280" | "1920">;
  mutationRisk: MutationClass;
  workflows?: string[];
  a11yScan: boolean;
  visualEligible: boolean;
  notes?: string;
};

export type QaStateEntry = {
  id: string;
  surface: SurfaceClass;
  description: string;
  route?: string;
  fixture?: string;
  workflows?: string[];
};

export type QaWorkflowStep = {
  id: string;
  title: string;
  mutation: MutationClass;
};

export type QaWorkflow = {
  id: string;
  title: string;
  surface: SurfaceClass;
  required: boolean;
  steps: QaWorkflowStep[];
  variants?: string[];
  /** Hosted staging may only run DRAFT_WRITE against STAGING QA records. */
  hostedDraftOnly?: boolean;
};

export type ControlDiscovery = {
  route: string;
  scenario: string;
  browser: string;
  viewport: string;
  role: string;
  name: string;
  controlType: string;
  enabled: boolean;
  href?: string | null;
  box?: { x: number; y: number; width: number; height: number } | null;
  mutation: MutationClass | "UNCLASSIFIED";
  exercisedBy?: string | null;
};
