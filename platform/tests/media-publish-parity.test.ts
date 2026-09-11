import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canMakePhotoAssignmentLive } from "@/lib/hub/media-label";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function sliceBetween(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  const end = source.indexOf(to);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("canMakePhotoAssignmentLive", () => {
  it("requires editing, preview, and a different photo before publish", () => {
    expect(
      canMakePhotoAssignmentLive({
        editing: false,
        previewed: true,
        proposedMediaId: "b",
        currentMediaId: "a",
      }),
    ).toBe(false);
    expect(
      canMakePhotoAssignmentLive({
        editing: true,
        previewed: false,
        proposedMediaId: "b",
        currentMediaId: "a",
      }),
    ).toBe(false);
    expect(
      canMakePhotoAssignmentLive({
        editing: true,
        previewed: true,
        proposedMediaId: "a",
        currentMediaId: "a",
      }),
    ).toBe(false);
    expect(
      canMakePhotoAssignmentLive({
        editing: true,
        previewed: true,
        proposedMediaId: "b",
        currentMediaId: "a",
      }),
    ).toBe(true);
  });
});

describe("contextual photo uploads never publish on their own", () => {
  it("keeps website photo upload out of website_documents", () => {
    const source = readSource("src/app/admin/website/media-actions.ts");
    expect(source).toContain("export async function stageWebsiteContextImage");
    expect(source).toContain("export async function assignWebsiteContextImage");
    expect(source).not.toContain("uploadWebsiteContextImage");

    const stage = sliceBetween(
      source,
      "export async function stageWebsiteContextImage",
      "export async function assignWebsiteContextImage",
    );
    expect(stage).not.toContain("website_documents");
  });

  it("keeps program poster upload off the program record", () => {
    const source = readSource("src/app/admin/programs/actions.ts");
    expect(source).toContain("export async function stageProgramCover");
    expect(source).toContain("export async function assignProgramCover");
    expect(source).not.toContain("uploadProgramCover");

    const stage = sliceBetween(
      source,
      "export async function stageProgramCover",
      "export async function assignProgramCover",
    );
    expect(stage).not.toContain("featured_media_id");
  });

  it("keeps branch photo upload off the branch page", () => {
    const source = readSource("src/app/admin/branches/media-actions.ts");
    expect(source).toContain("export async function stageBranchPhoto");
    expect(source).toContain("export async function assignBranchPhoto");
    expect(source).not.toContain("uploadBranchPhoto");

    const stage = sliceBetween(
      source,
      "export async function stageBranchPhoto",
      "export async function assignBranchPhoto",
    );
    expect(stage).not.toContain("branch_media");
  });

  it("gates the contextual photo editor Make live button on the shared rule", () => {
    const source = readSource("src/components/hub/contextual-photo-editor.tsx");
    expect(source).toContain("canMakePhotoAssignmentLive");
    expect(source).toContain("disabled={!canMakeLive}");
  });
});
