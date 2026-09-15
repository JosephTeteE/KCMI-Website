import { z } from "zod";
import { blankToUndefined, getPublicEnv } from "@/lib/env/public";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /** First-party Prayer intake cutover. Default off. Set to 1/true to enable. */
  KCMI_PRAYER_INTAKE_ENABLED: z.string().optional(),
  /** First-party Pastoral Care intake cutover. Default off. Set to 1/true to enable. */
  KCMI_PASTORAL_INTAKE_ENABLED: z.string().optional(),
  /** First-party Welfare intake cutover. Default off. Set to 1/true to enable. */
  KCMI_WELFARE_INTAKE_ENABLED: z.string().optional(),
  CONTENT_SOURCE: z.enum(["seed", "supabase"]).optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerEnv = ReturnType<typeof getPublicEnv> &
  z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const contentSource = blankToUndefined(process.env.CONTENT_SOURCE);
  const extra = serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: blankToUndefined(process.env.SUPABASE_SECRET_KEY),
    TURNSTILE_SECRET_KEY: blankToUndefined(process.env.TURNSTILE_SECRET_KEY),
    KCMI_PRAYER_INTAKE_ENABLED: blankToUndefined(
      process.env.KCMI_PRAYER_INTAKE_ENABLED,
    ),
    KCMI_PASTORAL_INTAKE_ENABLED: blankToUndefined(
      process.env.KCMI_PASTORAL_INTAKE_ENABLED,
    ),
    KCMI_WELFARE_INTAKE_ENABLED: blankToUndefined(
      process.env.KCMI_WELFARE_INTAKE_ENABLED,
    ),
    CONTENT_SOURCE:
      contentSource === "seed" || contentSource === "supabase"
        ? contentSource
        : undefined,
    NODE_ENV: process.env.NODE_ENV,
  });
  return { ...getPublicEnv(), ...extra };
}

export function requireSupabaseSecretConfig(): {
  url: string;
  secretKey: string;
} {
  const env = getServerEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!env.SUPABASE_SECRET_KEY) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  };
}
