import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canAssignRequests,
  canUpdateRequests,
  canViewRequestsInbox,
} from "@/lib/requests/access";
import { isWebsiteRequestHoneypotTriggered } from "@/lib/requests/abuse";
import { hashWebsiteRequestRequesterKey } from "@/lib/requests/rate-limit";
import { validateWebsiteRequestSubmission } from "@/lib/requests/validate";
import {
  parseTopicQuery,
  previewMessage,
  REQUEST_AUDIT_ACTIONS,
  WEBSITE_REQUEST_TOPICS,
} from "@/lib/requests/types";
import { permissionsForRoles } from "@/lib/authorization/rbac";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Website Messages & Requests — validation", () => {
  it("accepts a valid Contact submission shape", () => {
    const result = validateWebsiteRequestSubmission({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+234 801 234 5678",
      topic: "cell_fellowship",
      message: "I would like to join a cell fellowship near me.",
      source: "contact?topic=cell-fellowship",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.topic).toBe("cell_fellowship");
      expect(result.data.email).toBe("ada@example.com");
    }
  });

  it("rejects invalid input", () => {
    const result = validateWebsiteRequestSubmission({
      fullName: "",
      email: "not-an-email",
      phone: "12",
      topic: "prayer",
      message: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.fullName).toBeTruthy();
      expect(result.fieldErrors?.email).toBeTruthy();
      expect(result.fieldErrors?.topic).toBeTruthy();
      expect(result.fieldErrors?.message).toBeTruthy();
    }
  });

  it("does not allow Care topics on website_requests", () => {
    for (const topic of ["prayer", "pastoral", "welfare", "counselling"]) {
      const result = validateWebsiteRequestSubmission({
        fullName: "Test Person",
        email: "test@example.com",
        topic,
        message: "Hello",
      });
      expect(result.ok).toBe(false);
    }
    expect(WEBSITE_REQUEST_TOPICS).not.toContain("prayer");
  });

  it("parses safe topic query values", () => {
    expect(parseTopicQuery("cell-fellowship")).toBe("cell_fellowship");
    expect(parseTopicQuery("service-team")).toBe("service_volunteer");
    expect(parseTopicQuery("testimony")).toBe("testimony_thanksgiving");
    expect(parseTopicQuery("hack<script>")).toBeNull();
  });
});

describe("Website Messages & Requests — abuse / privacy", () => {
  it("detects honeypot without exposing signal", () => {
    expect(isWebsiteRequestHoneypotTriggered("Acme")).toBe(true);
    expect(isWebsiteRequestHoneypotTriggered("")).toBe(false);
    expect(isWebsiteRequestHoneypotTriggered(undefined)).toBe(false);
  });

  it("hashes requester keys and never stores raw IP in hashing helper output", () => {
    const secret = "test-secret-key-for-hmac";
    const hash = hashWebsiteRequestRequesterKey("203.0.113.10", secret);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("203.0.113");
    expect(hash).toBe(
      createHmac("sha256", secret)
        .update("kcmi-website-request|v1|203.0.113.10")
        .digest("hex"),
    );
  });

  it("message preview truncates safely for inbox cards", () => {
    const long = "a".repeat(200);
    expect(previewMessage(long, 40).endsWith("…")).toBe(true);
    expect(previewMessage(long, 40).length).toBeLessThanOrEqual(40);
  });
});

describe("Website Messages & Requests — RBAC", () => {
  it("grants inbox permissions to super_admin and media_admin only by default", () => {
    const superPerms = permissionsForRoles(["super_admin"]);
    const mediaPerms = permissionsForRoles(["media_admin"]);
    const carePerms = permissionsForRoles(["care_operator"]);

    expect(canViewRequestsInbox([...superPerms])).toBe(true);
    expect(canUpdateRequests([...superPerms])).toBe(true);
    expect(canAssignRequests([...superPerms])).toBe(true);

    expect(canViewRequestsInbox([...mediaPerms])).toBe(true);
    expect(canUpdateRequests([...mediaPerms])).toBe(true);
    expect(canAssignRequests([...mediaPerms])).toBe(true);

    expect(canViewRequestsInbox([...carePerms])).toBe(false);
    expect(canUpdateRequests([...carePerms])).toBe(false);
    expect(canAssignRequests([...carePerms])).toBe(false);
  });

  it("anonymous has no requests permissions", () => {
    expect(canViewRequestsInbox([])).toBe(false);
  });
});

describe("Website Messages & Requests — architecture contracts", () => {
  it("persists via service-role submit and emails only after insert", () => {
    const submit = readSrc("src/lib/requests/submit.ts");
    expect(submit).toContain("createSecretKeyClient");
    expect(submit).toContain('.from("website_requests")');
    expect(submit).toContain("notifyWebsiteRequestReceived");
    // Runtime order: insert block completes before notify call.
    const insertBlock = submit.indexOf("await insert");
    const insertFrom = submit.indexOf('.from("website_requests")\n      .insert');
    const notifyCall = submit.indexOf("await notifyWebsiteRequestReceived");
    expect(insertFrom).toBeGreaterThan(-1);
    expect(notifyCall).toBeGreaterThan(insertFrom);
    expect(insertBlock).toBe(-1); // no separate helper name required
    expect(submit).toContain("We could not save your message");
  });

  it("notification uses Reply-To and server-only Resend env", () => {
    const notify = readSrc("src/lib/requests/notify.ts");
    expect(notify).toContain("reply_to");
    expect(notify).toContain("RESEND_API_KEY");
    expect(notify).toContain("api.resend.com");
    expect(notify).not.toContain("NEXT_PUBLIC_RESEND");

    const envExample = readSrc(".env.example");
    expect(envExample).toContain("RESEND_API_KEY");
    expect(envExample).toContain("KCMI_CONTACT_NOTIFICATION_TO");
  });

  it("Hub nav and pages gate on requests.read; Care stays separate", () => {
    const nav = readSrc("src/components/layout/hub-nav.tsx");
    expect(nav).toContain("Messages & Requests");
    expect(nav).toContain("canViewRequestsInbox");

    const careSubmit = readSrc("src/lib/care/prayer-submit.ts");
    expect(careSubmit).toContain("pastoral_requests");
    expect(careSubmit).not.toContain("website_requests");

    const pastoral = readSrc("src/lib/care/pastoral-submit.ts");
    expect(pastoral).toContain("pastoral_requests");
    expect(pastoral).not.toContain("website_requests");

    const welfare = readSrc("src/lib/care/welfare-submit.ts");
    expect(welfare).toContain("pastoral_requests");
    expect(welfare).not.toContain("website_requests");
  });

  it("does not join Care tables into inbox queries or public search", () => {
    const queries = readSrc("src/lib/requests/queries.ts");
    expect(queries).toContain("website_requests");
    expect(queries).not.toContain("pastoral_requests");
    expect(queries).not.toContain("pastoral_case_notes");

    const search = readSrc("src/lib/search/public-search.ts");
    expect(search).not.toContain("website_requests");

    const migration = readSrc(
      "supabase/migrations/20260921140000_website_requests_inbox.sql",
    );
    expect(migration).toContain("website_requests");
    expect(migration).toContain("requests.read");
    expect(migration).toContain("revoke all on table public.website_requests from public, anon");
  });

  it("detail view escapes via React text nodes and uses mailto when email exists", () => {
    const detail = readSrc("src/components/hub/website-request-detail.tsx");
    expect(detail).toContain("request.message");
    expect(detail).not.toContain("dangerouslySetInnerHTML");
    expect(detail).toContain("mailto:");
    expect(detail).toContain("data-testid=\"request-reply-mailto\"");
  });

  it("audits assignment and status without message body", () => {
    const actions = readSrc("src/app/admin/requests/actions.ts");
    expect(actions).toContain("REQUEST_AUDIT_ACTIONS.assigned");
    expect(actions).toContain("REQUEST_AUDIT_ACTIONS.statusChanged");
    expect(actions).not.toMatch(/metadata:\s*\{[^}]*message:/);
    expect(REQUEST_AUDIT_ACTIONS.assigned).toBe("request.assigned");
    expect(REQUEST_AUDIT_ACTIONS.statusChanged).toBe("request.status_changed");
  });

  it("omits internal notes in V1", () => {
    const migration = readSrc(
      "supabase/migrations/20260921140000_website_requests_inbox.sql",
    );
    expect(migration).not.toContain("website_request_notes");
    expect(readSrc("src/app/admin/requests/actions.ts")).not.toContain(
      "note_added",
    );
  });

  it("Staff & Access describes Messages & Requests for Website & Media", () => {
    const presets = readSrc("src/lib/hub/staff-presets.ts");
    expect(presets).toContain("Messages & Requests");
  });
});

describe("Website Messages & Requests — submit persistence order (mocked)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("does not claim success when DB insert fails", async () => {
    vi.doMock("@/lib/requests/rate-limit", () => ({
      consumeWebsiteRequestRateLimit: vi.fn(async () => ({ allowed: true })),
      WEBSITE_REQUEST_RATE_LIMITED_MESSAGE: "Please try again in a little while.",
      hashWebsiteRequestRequesterKey: hashWebsiteRequestRequesterKey,
    }));
    vi.doMock("@/lib/requests/notify", () => ({
      notifyWebsiteRequestReceived: vi.fn(async () => {
        throw new Error("email should not run");
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSecretKeyClient: () => ({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { code: "db_down", message: "fail" },
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    }));

    const { submitWebsiteRequest } = await import("@/lib/requests/submit");
    const result = await submitWebsiteRequest({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      topic: "general",
      message: "Hello church",
      company: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.toLowerCase()).toContain("could not save");
    }
  });

  it("keeps success when email notification fails after persistence", async () => {
    const notify = vi.fn(async () => ({
      ok: false as const,
      status: "failed" as const,
      reason: "http_500",
    }));
    vi.doMock("@/lib/requests/rate-limit", () => ({
      consumeWebsiteRequestRateLimit: vi.fn(async () => ({ allowed: true })),
      WEBSITE_REQUEST_RATE_LIMITED_MESSAGE: "Please try again in a little while.",
    }));
    vi.doMock("@/lib/requests/notify", () => ({
      notifyWebsiteRequestReceived: notify,
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSecretKeyClient: () => ({
        from: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: "req-1", reference_code: "KCMI-REQ-ABC123" },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }),
      }),
    }));

    const { submitWebsiteRequest } = await import("@/lib/requests/submit");
    const result = await submitWebsiteRequest({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      topic: "general",
      message: "Hello church",
      company: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.referenceCode).toBe("KCMI-REQ-ABC123");
    }
    expect(notify).toHaveBeenCalledOnce();
  });
});
