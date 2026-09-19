import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseProgramFields } from "@/lib/programs/parse-fields";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/authorization/rbac";

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    fd.set(k, v);
  }
  return fd;
}

describe("program optional advanced fields", () => {
  it("accepts name-only payload with empty schedule (no invented date)", () => {
    const parsed = parseProgramFields(
      form({
        title: "Easter Poster",
        short_description: "Join us",
        sessions_json: "[]",
        action_kind: "none",
      }),
      { forcePlacementNone: true },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.starts_at).toBeNull();
    expect(parsed.fields.ends_at).toBeNull();
    expect(parsed.fields.sessions).toEqual([]);
    expect(parsed.fields.location_kind).toBeNull();
    expect(parsed.fields.action_kind).toBe("none");
  });

  it("does not invent a Main Sanctuary location when location omitted", () => {
    const parsed = parseProgramFields(
      form({
        title: "Youth Night",
        sessions_json: "[]",
        action_kind: "none",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.hasLocationPayload).toBe(false);
    expect(parsed.fields.location_kind).toBeNull();
    expect(parsed.fields.location_label).toBeNull();
  });

  it("still allows date-only sessions without inventing a start time", () => {
    const parsed = parseProgramFields(
      form({
        title: "Conference",
        sessions_json: JSON.stringify([
          {
            session_date: "2026-10-12",
            start_time: null,
            end_time: null,
            label: null,
            sort_order: 0,
          },
        ]),
        action_kind: "none",
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.fields.sessions[0]?.start_time).toBeNull();
  });

  it("rejects end time without start time", () => {
    const parsed = parseProgramFields(
      form({
        title: "Conference",
        sessions_json: JSON.stringify([
          {
            session_date: "2026-10-12",
            start_time: null,
            end_time: "18:00",
            label: null,
            sort_order: 0,
          },
        ]),
        action_kind: "none",
      }),
    );
    expect(parsed.ok).toBe(false);
  });
});

describe("program publish lifecycle wiring", () => {
  it("allows clearing schedule on edit (empty sessions_json is not an error)", () => {
    const actions = readSrc("src/app/admin/programs/actions.ts");
    expect(actions).not.toContain(
      "Add at least one date and start time for this program.",
    );
    expect(actions).toMatch(
      /if \(sessions\.length === 0\) return \{ error: null \}/,
    );
  });

  it("create and edit actions support publish intent with permission gate", () => {
    const actions = readSrc("src/app/admin/programs/actions.ts");
    expect(actions).toContain('intentRaw === "publish"');
    expect(actions).toContain('requireStaffAction("programs.publish")');
    expect(actions).toContain('const status = intent === "publish" ? "published" : "draft"');
    expect(actions).toContain('patch.status = "published"');
    expect(actions).toContain("save_intent");
  });

  it("active Hub pages mount ProgramForm with Publish Program", () => {
    const formUi = readSrc("src/components/hub/program-form.tsx");
    const newPage = readSrc("src/app/admin/programs/new/page.tsx");
    const editPage = readSrc("src/app/admin/programs/[id]/page.tsx");
    expect(newPage).toContain("ProgramForm");
    expect(editPage).toContain("ProgramForm");
    expect(formUi).toContain('data-testid="program-publish"');
    expect(formUi).toContain('data-testid="program-save-draft"');
    expect(formUi).toContain("Publish Program");
    expect(formUi).toContain('submit("publish")');
    expect(formUi).toContain("Advanced details (optional)");
  });

  it("media_admin has create + publish; care_operator does not publish", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.media_admin).toContain("programs.create");
    expect(DEFAULT_ROLE_PERMISSIONS.media_admin).toContain("programs.publish");
    expect(DEFAULT_ROLE_PERMISSIONS.care_operator).not.toContain(
      "programs.publish",
    );
    expect(DEFAULT_ROLE_PERMISSIONS.care_operator).not.toContain(
      "programs.create",
    );
  });
});
