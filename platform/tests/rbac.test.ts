import { describe, expect, it } from "vitest";
import {
  assertMediaCannotReadPastoral,
  canAccessPastoralNarratives,
  permissionsForRoles,
  roleHasPermission,
} from "@/lib/authorization/rbac";
import { brandPrimitives, contrastNotes } from "@/lib/design/tokens";

describe("RBAC foundation", () => {
  it("does not grant pastoral read to super_admin by default", () => {
    expect(roleHasPermission("super_admin", "prayer.read")).toBe(false);
    expect(roleHasPermission("super_admin", "counselling.read")).toBe(false);
    expect(roleHasPermission("super_admin", "users.manage")).toBe(true);
  });

  it("does not grant pastoral read to media_admin", () => {
    expect(assertMediaCannotReadPastoral(["media_admin"])).toBe(true);
    const perms = permissionsForRoles(["media_admin"]);
    expect(canAccessPastoralNarratives(perms)).toBe(false);
    expect(perms.has("media.manage")).toBe(true);
    expect(perms.has("programs.update")).toBe(true);
    expect(perms.has("website.manage")).toBe(true);
    expect(perms.has("livestream.manage")).toBe(true);
    expect(perms.has("branches.manage")).toBe(true);
    expect(perms.has("events.manage")).toBe(true);
    expect(perms.has("registrations.manage")).toBe(false);
    expect(perms.has("payment_evidence.review")).toBe(false);
    expect(perms.has("users.manage")).toBe(false);
    expect(perms.has("giving.propose")).toBe(false);
    expect(perms.has("giving.approve")).toBe(false);
  });

  it("grants media.manage, website.manage, and programs.update to super_admin", () => {
    expect(roleHasPermission("super_admin", "media.manage")).toBe(true);
    expect(roleHasPermission("super_admin", "website.manage")).toBe(true);
    expect(roleHasPermission("super_admin", "programs.update")).toBe(true);
  });

  it("grants pastoral reads to pastoral_admin", () => {
    const perms = permissionsForRoles(["pastoral_admin"]);
    expect(canAccessPastoralNarratives(perms)).toBe(true);
    expect(perms.has("welfare.assign")).toBe(true);
  });

  it("allows explicit pastoral grant alongside super_admin", () => {
    const perms = permissionsForRoles(["super_admin"], ["prayer.read"]);
    expect(canAccessPastoralNarratives(perms)).toBe(true);
  });

  it("program_drafter can draft but not publish", () => {
    expect(roleHasPermission("program_drafter", "programs.create")).toBe(true);
    expect(roleHasPermission("program_drafter", "programs.publish")).toBe(false);
    expect(roleHasPermission("program_drafter", "media.manage")).toBe(false);
    expect(roleHasPermission("program_drafter", "website.manage")).toBe(false);
    expect(roleHasPermission("branch_admin", "website.manage")).toBe(false);
  });
});

describe("Brand primitives", () => {
  it("uses authoritative hex values", () => {
    expect(brandPrimitives.offWhite).toBe("#eff5f5");
    expect(brandPrimitives.red).toBe("#b60b13");
    expect(brandPrimitives.green).toBe("#108c1d");
    expect(brandPrimitives.lavender).toBe("#c298b7");
    expect(brandPrimitives.violet).toBe("#7c1963");
  });

  it("documents lavender and green contrast constraints", () => {
    expect(contrastNotes.lavender.toLowerCase()).toContain("dark");
    expect(contrastNotes.green.toLowerCase()).toContain("white");
  });
});
