import { afterEach, describe, expect, it } from "vitest";
import {
  hasSupabasePublicConfig,
  isHostedKcmiEnvironment,
  isStagingEnvironment,
  requireSupabasePublicConfig,
  resolvePublicSiteUrl,
  shouldUseSeedContent,
} from "@/lib/env";
import { getChurchIdentity } from "@/content";
import { stagingRobotsHeaders } from "@/lib/security/headers";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "KCMI_ENVIRONMENT",
  "CONTENT_SOURCE",
] as const;

const snapshot: Record<string, string | undefined> = {};

for (const key of ENV_KEYS) {
  snapshot[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

afterEach(restoreEnv);

describe("canonical env contract", () => {
  it("does not treat legacy anon/service_role names as configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service";
    expect(hasSupabasePublicConfig()).toBe(false);
  });

  it("uses NEXT_PUBLIC_SITE_URL for identity origin when set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://kcmi-website-seven.vercel.app";
    delete process.env.KCMI_ENVIRONMENT;
    expect(getChurchIdentity().siteUrl).toBe(
      "https://kcmi-website-seven.vercel.app",
    );
    expect(resolvePublicSiteUrl("https://www.kcmi-rcc.org")).toBe(
      "https://kcmi-website-seven.vercel.app",
    );
  });
});

describe("hosted fail-closed CMS", () => {
  it("throws when staging is missing the Supabase URL", () => {
    process.env.KCMI_ENVIRONMENT = "staging";
    delete process.env.CONTENT_SOURCE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(() => shouldUseSeedContent()).toThrow(/Missing NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when staging is missing the publishable key", () => {
    process.env.KCMI_ENVIRONMENT = "staging";
    delete process.env.CONTENT_SOURCE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(() => shouldUseSeedContent()).toThrow(
      /Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("rejects CONTENT_SOURCE=seed on staging", () => {
    process.env.KCMI_ENVIRONMENT = "staging";
    process.env.CONTENT_SOURCE = "seed";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(() => shouldUseSeedContent()).toThrow(/CONTENT_SOURCE=seed is not allowed/);
  });

  it("requires NEXT_PUBLIC_SITE_URL on production", () => {
    process.env.KCMI_ENVIRONMENT = "production";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(() => resolvePublicSiteUrl("https://www.kcmi-rcc.org")).toThrow(
      /Missing NEXT_PUBLIC_SITE_URL/,
    );
  });

  it("does not use seed when staging is fully configured", () => {
    process.env.KCMI_ENVIRONMENT = "staging";
    delete process.env.CONTENT_SOURCE;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(isHostedKcmiEnvironment()).toBe(true);
    expect(shouldUseSeedContent()).toBe(false);
    expect(requireSupabasePublicConfig().publishableKey).toBe("sb_publishable_test");
  });
});

describe("staging robots", () => {
  it("emits X-Robots-Tag only for staging", () => {
    process.env.KCMI_ENVIRONMENT = "staging";
    expect(isStagingEnvironment()).toBe(true);
    expect(stagingRobotsHeaders()).toEqual([
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ]);
    process.env.KCMI_ENVIRONMENT = "production";
    expect(stagingRobotsHeaders()).toEqual([]);
  });
});
