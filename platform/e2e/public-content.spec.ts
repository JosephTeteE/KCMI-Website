import { expect, test } from "@playwright/test";

test("unknown event slug is not a generic Event page", async ({ page }) => {
  const response = await page.goto("/events/unknown-event", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /^Event$/ })).toHaveCount(0);
});

test("contact uses the public contact identity without DFR Subscribe", async ({
  page,
}) => {
  await page.goto("/contact", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("link", { name: "contact@kcmi-rcc.org" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Subscribe");
  await expect(page.locator("main")).not.toContainText("gmail.com");
});

test("privacy page contains no known legacy-architecture strings", async ({
  page,
}) => {
  await page.goto("/privacy", { waitUntil: "networkidle" });
  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/Google Drive/i);
  expect(text).not.toMatch(/Google Sheet/i);
  expect(text).not.toMatch(/\bJWT\b/);
  expect(text).not.toMatch(/reCAPTCHA/i);
  expect(text).not.toMatch(/PRE-PRODUCTION/i);
  expect(text).not.toMatch(/pastoral-case software/i);
  expect(text).toMatch(/Supabase/i);
});

test("sermons page does not keep the original generic seed headline", async ({
  page,
}) => {
  await page.goto("/sermons", { waitUntil: "networkidle" });
  await expect(page.locator("main")).not.toContainText(
    "Experience the Word of God Anytime, Anywhere.",
  );
});

test("About leads with church and mission rather than biography", async ({
  page,
}) => {
  await page.goto("/about", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "About KCMI", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who We Are", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Vision" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Our Mission" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Meet Our Lead Pastor/i }),
  ).toBeVisible();
});
