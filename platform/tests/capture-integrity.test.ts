import { describe, expect, it } from "vitest";
import {
  assertHomeNoBranchDump,
  assertLocationsFinderCompact,
  assertNoDuplicateCountryPlaceLine,
  assertNoPublicErrorPage,
  assertRouteLandmarks,
  assertScenarioState,
} from "../scripts/lib/capture-integrity.mjs";

describe("capture integrity", () => {
  it("rejects Next/server error pages", () => {
    expect(() =>
      assertNoPublicErrorPage("This page couldn't load — A server error occurred.", "/"),
    ).toThrow(/integrity failed/);
  });

  it("requires Homepage identity landmarks", () => {
    expect(() =>
      assertRouteLandmarks("/", "Welcome only", "public"),
    ).toThrow(/landmark missing/);
    expect(() =>
      assertRouteLandmarks(
        "/",
        "KCMI · Rehoboth Christian Center Raising Kings To Build The Kingdom",
        "public",
      ),
    ).not.toThrow();
  });

  it("fails Hub captures that land on sign-in", () => {
    expect(() =>
      assertRouteLandmarks("/admin", "Sign in to the KCMI Hub", "hub"),
    ).toThrow(/sign-in/);
  });

  it("rejects missing-service-time apology on locations", () => {
    expect(() =>
      assertLocationsFinderCompact(
        "Service times will be published here when they are available.",
      ),
    ).toThrow(/apology/);
  });

  it("rejects homepage branch dump signal", () => {
    const body = Array.from({ length: 5 }, () => "Open in Maps").join("\n");
    expect(() => assertHomeNoBranchDump(body)).toThrow(/dump/);
  });

  it("rejects duplicated country place lines", () => {
    expect(() =>
      assertNoDuplicateCountryPlaceLine("Port Harcourt, Nigeria · Nigeria"),
    ).toThrow(/Duplicate country/);
    expect(() =>
      assertNoDuplicateCountryPlaceLine("Port Harcourt, Nigeria"),
    ).not.toThrow();
  });
});

describe("scenario integrity", () => {
  it("requires Spotlight on/off to match named state", () => {
    expect(() =>
      assertScenarioState("spotlight:on", {
        bodyText: "D1.7 Review Spotlight Program",
      }),
    ).not.toThrow();
    expect(() =>
      assertScenarioState("spotlight:off", {
        bodyText: "D1.7 Review Spotlight Program",
      }),
    ).toThrow(/unexpectedly present/);
  });

  it("requires takeover dialog evidence when named on", () => {
    expect(() =>
      assertScenarioState("takeover:on", { html: "<dialog open>Spotlight</dialog>" }),
    ).not.toThrow();
    expect(() =>
      assertScenarioState("takeover:on", { html: "<div>no dialog</div>", bodyText: "Home" }),
    ).toThrow(/dialog/);
  });

  it("requires watch sermon vs fallback to agree", () => {
    expect(() =>
      assertScenarioState("watch:sermon", { bodyText: "D1.7 Review Message" }),
    ).not.toThrow();
    expect(() =>
      assertScenarioState("watch:fallback", { bodyText: "D1.7 Review Message" }),
    ).toThrow(/unexpectedly present/);
  });

  it("requires branch with/without media evidence", () => {
    expect(() =>
      assertScenarioState("branch:with-media", {
        html: `<div data-branch-media="hero" data-qa-fixture="d17-seed-hq-hero"></div>`,
        hasHeroMedia: true,
        fixtureId: "d17-seed-hq-hero",
      }),
    ).not.toThrow();
    expect(() =>
      assertScenarioState("branch:with-media", {
        html: "<div>no media</div>",
        hasHeroMedia: false,
      }),
    ).toThrow(/not rendered|absent/);
    expect(() =>
      assertScenarioState("branch:without-media", {
        html: `<div data-branch-media="hero"></div>`,
        hasHeroMedia: true,
      }),
    ).toThrow(/unexpectedly present/);
    expect(() =>
      assertScenarioState("branch:without-media", {
        html: `<div data-qa-branch-media="without-media"></div>`,
        hasHeroMedia: false,
      }),
    ).not.toThrow();
  });

  it("requires tour coach-mark evidence", () => {
    expect(() =>
      assertScenarioState("tour:coachmark", {
        bodyText: "Step 1 of 11",
        tourStepVisible: true,
        tourTargetHighlighted: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertScenarioState("tour:coachmark", {
        bodyText: "Dashboard only",
        tourStepVisible: false,
      }),
    ).toThrow(/coach-mark/);
  });
});
