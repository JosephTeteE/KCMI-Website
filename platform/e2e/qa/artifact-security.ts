/**
 * Artifact security scanner — FAIL packaging if secrets/session material found.
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";

const FORBIDDEN_NAME = [
  /^\.auth$/i,
  /\.env(\.|$)/i,
  /cookies?/i,
  /storageState/i,
  /secret/i,
  /service.?role/i,
];

const FORBIDDEN_CONTENT = [
  { name: "jwt-like", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "authorization-header", pattern: /authorization\s*[:=]\s*bearer\s+\S+/i },
  { name: "supabase-service-role", pattern: /service_role/i },
  { name: "mfa-otpauth", pattern: /otpauth:\/\/totp/i },
  { name: "begin-private-key", pattern: /-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: "password-assignment", pattern: /password\s*[:=]\s*['"][^'"]{8,}/i },
];

export type ArtifactScanResult = {
  ok: boolean;
  scannedFiles: number;
  violations: Array<{ path: string; reason: string }>;
};

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (FORBIDDEN_NAME.some((r) => r.test(name))) {
        out.push(p);
        continue;
      }
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

export function scanShareableArtifacts(
  rootDir: string,
): ArtifactScanResult {
  const violations: Array<{ path: string; reason: string }> = [];
  const files = walk(rootDir);
  for (const file of files) {
    const rel = relative(rootDir, file);
    const base = rel.split(/[/\\]/).pop() ?? rel;
    if (FORBIDDEN_NAME.some((r) => r.test(base)) || /\.auth\//i.test(rel)) {
      violations.push({ path: rel, reason: `forbidden artifact name/path: ${base}` });
      continue;
    }
    if (/\.(png|jpg|jpeg|webp|gif|zip|woff2?)$/i.test(base)) continue;
    if (statSync(file).size > 2_000_000) continue;
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const rule of FORBIDDEN_CONTENT) {
      if (rule.pattern.test(text)) {
        violations.push({ path: rel, reason: rule.name });
        break;
      }
    }
  }
  return {
    ok: violations.length === 0,
    scannedFiles: files.length,
    violations,
  };
}

export function assertShareableArtifactsClean(rootDir: string): void {
  const result = scanShareableArtifacts(rootDir);
  if (!result.ok) {
    const detail = result.violations
      .slice(0, 20)
      .map((v) => `${v.path}: ${v.reason}`)
      .join("\n");
    throw new Error(
      `ARTIFACT SECURITY FAIL (${result.violations.length} violation(s)):\n${detail}`,
    );
  }
}
