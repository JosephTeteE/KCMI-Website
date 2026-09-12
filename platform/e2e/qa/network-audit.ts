/**
 * Runtime console + network auditors for QA1.
 */

import type { Page, Request, Response } from "@playwright/test";
import { APPROVED_EXTERNAL_HOSTS } from "./mutation-policy";

export type ConsoleFinding = {
  type: string;
  text: string;
  url?: string;
};

export type NetworkFinding = {
  url: string;
  status: number;
  origin: "FIRST_PARTY" | "SUPABASE" | "APPROVED_EXTERNAL" | "UNKNOWN_EXTERNAL";
};

const BENIGN_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
];

export function attachRuntimeAuditors(page: Page, baseUrl: string) {
  const consoleFindings: ConsoleFinding[] = [];
  const networkFindings: NetworkFinding[] = [];
  const firstPartyHost = (() => {
    try {
      return new URL(baseUrl).hostname;
    } catch {
      return "127.0.0.1";
    }
  })();

  page.on("pageerror", (err) => {
    consoleFindings.push({ type: "pageerror", text: err.message });
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (BENIGN_CONSOLE.some((p) => p.test(text))) return;
    consoleFindings.push({ type: "console.error", text });
  });
  page.on("response", (res: Response) => {
    const status = res.status();
    if (status < 400) return;
    const url = res.url();
    networkFindings.push({
      url: redactUrl(url),
      status,
      origin: classifyOrigin(url, firstPartyHost),
    });
  });

  return {
    consoleFindings,
    networkFindings,
    unexpectedFirstPartyFailures: () =>
      networkFindings.filter(
        (f) => f.origin === "FIRST_PARTY" && (f.status >= 500 || f.status === 404),
      ),
    unexpectedPageErrors: () =>
      consoleFindings.filter((f) => f.type === "pageerror"),
  };
}

function classifyOrigin(
  url: string,
  firstPartyHost: string,
): NetworkFinding["origin"] {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === firstPartyHost || host === "127.0.0.1" || host === "localhost") {
      return "FIRST_PARTY";
    }
    if (host.includes("supabase")) return "SUPABASE";
    if (
      (APPROVED_EXTERNAL_HOSTS as readonly string[]).some(
        (h) => host === h || host.endsWith(`.${h}`),
      )
    ) {
      return "APPROVED_EXTERNAL";
    }
    return "UNKNOWN_EXTERNAL";
  } catch {
    return "UNKNOWN_EXTERNAL";
  }
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "[unparseable-url]";
  }
}

/** Unused Request type keep for future request-header redaction hooks. */
export type { Request };
