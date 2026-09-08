import { z } from "zod";

/**
 * Browser-safe environment validation.
 * Do not import server env helpers from Client Components.
 */

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const kcmiEnvironmentSchema = z.enum([
  "development",
  "test",
  "staging",
  "production",
]);

export type KcmiEnvironment = z.infer<typeof kcmiEnvironmentSchema>;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  KCMI_ENVIRONMENT: kcmiEnvironmentSchema.optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function parseKcmiEnvironment(
  value: string | undefined,
): KcmiEnvironment | undefined {
  const trimmed = blankToUndefined(value);
  if (!trimmed) return undefined;
  const parsed = kcmiEnvironmentSchema.safeParse(trimmed);
  return parsed.success ? parsed.data : undefined;
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: blankToUndefined(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: blankToUndefined(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: blankToUndefined(
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    ),
    NEXT_PUBLIC_SITE_URL: blankToUndefined(process.env.NEXT_PUBLIC_SITE_URL),
    KCMI_ENVIRONMENT: parseKcmiEnvironment(process.env.KCMI_ENVIRONMENT),
  });
}

export function isHostedKcmiEnvironment(): boolean {
  const env = parseKcmiEnvironment(process.env.KCMI_ENVIRONMENT);
  return env === "staging" || env === "production";
}

export function isStagingEnvironment(): boolean {
  return parseKcmiEnvironment(process.env.KCMI_ENVIRONMENT) === "staging";
}

export function hasSupabasePublicConfig(): boolean {
  const env = getPublicEnv();
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function requireSupabasePublicConfig(): {
  url: string;
  publishableKey: string;
} {
  const env = getPublicEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function shouldUseSeedContent(): boolean {
  const explicitSeed = blankToUndefined(process.env.CONTENT_SOURCE) === "seed";
  if (isHostedKcmiEnvironment()) {
    if (explicitSeed) {
      throw new Error(
        "CONTENT_SOURCE=seed is not allowed when KCMI_ENVIRONMENT is staging or production",
      );
    }
    requireSupabasePublicConfig();
    return false;
  }
  return explicitSeed || !hasSupabasePublicConfig();
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolvePublicSiteUrl(fallback: string): string {
  const envUrl = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  if (isHostedKcmiEnvironment()) {
    if (!envUrl) {
      throw new Error("Missing NEXT_PUBLIC_SITE_URL for staging/production");
    }
    return stripTrailingSlash(envUrl);
  }
  return stripTrailingSlash(envUrl ?? fallback);
}

export { blankToUndefined };
