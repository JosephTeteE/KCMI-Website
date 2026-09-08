export {
  getPublicEnv,
  hasSupabasePublicConfig,
  isHostedKcmiEnvironment,
  isStagingEnvironment,
  requireSupabasePublicConfig,
  resolvePublicSiteUrl,
  shouldUseSeedContent,
} from "@/lib/env/public";
export type { KcmiEnvironment, PublicEnv } from "@/lib/env/public";
export { getServerEnv, requireSupabaseSecretConfig } from "@/lib/env/server";
export type { ServerEnv } from "@/lib/env/server";
