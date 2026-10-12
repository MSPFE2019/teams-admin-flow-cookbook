const { test, expect } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const url = pathToFileURL(path.resolve(__dirname, "..", "..", "index.html")).href;

test.beforeEach(async ({ page }) => {
  await page.goto(url);
});
test("catalog loads locally without network or script errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const outgoing = [];
  page.on("request", request => { if (/^https?:/.test(request.url())) outgoing.push(request.url()); });
  await page.reload();
  await expect(page.locator(".recipe")).toHaveCount(13);
  await expect(page.locator("#result-count")).toContainText("13 of 13");
  expect(errors).toEqual([]);
  expect(outgoing).toEqual([]);
});
test("search, combined filters, empty state and reset", async ({ page }) => {
  await page.locator("#search").fill("transcript content");
  await page.locator("#category").selectOption("Meetings");
  await page.locator("#response").selectOption("text");
  await expect(page.locator(".recipe")).toHaveCount(1);
  await expect(page.locator("#transcript-content")).toBeVisible();
  await page.locator("#search").fill("not-found-xyz");
  await expect(page.locator("#recipes")).toContainText("No matching recipes");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".recipe")).toHaveCount(13);
});
test("clouds hide unsupported APIs and match audience/authority", async ({ page }) => {
  await page.locator("#cloud").selectOption("china");
  await expect(page.locator(".recipe")).toHaveCount(6);
  await expect(page.locator("#transcripts")).toHaveCount(0);
  await page.locator("#cloud").selectOption("dod");
  await expect(page.locator(".recipe")).toHaveCount(12);
  await expect(page.locator("#team-activity")).toHaveCount(0);
  await expect(page.locator("#cloud-info")).toContainText("https://dod-graph.microsoft.us");
  await expect(page.locator("#cloud-info")).toContainText("https://login.microsoftonline.us");
});
test("URI builder encodes raw IDs and copy fallback is explicit", async ({ page }) => {
  await page.locator("#channel-members summary").click();
  await page.locator("#channel-members-teamId").fill("demo-team");
  await page.locator("#channel-members-channelId").fill("19:abc/def@thread.v2");
  const uri = "https://graph.microsoft.com/v1.0/teams/demo-team/channels/19%3Aabc%2Fdef%40thread.v2/members";
  await expect(page.locator("#channel-members pre")).toHaveText(uri);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
  await page.locator("#channel-members").getByRole("button", { name: "Copy full endpoint" }).click();
  await expect(page.locator("#channel-members .copy-message")).toContainText("Clipboard unavailable");
  expect(await page.evaluate(() => window.getSelection().toString())).toBe(uri);
});
test("successful copy and template warning", async ({ page }) => {
  await page.evaluate(() => {
    window.copiedText = "";
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => { window.copiedText = text; } } });
  });
  await page.locator("#joined-teams summary").click();
  await page.locator("#joined-teams").getByRole("button", { name: "Copy URL template" }).click();
  await expect(page.locator("#joined-teams .copy-message")).toContainText("Replace every placeholder");
  expect(await page.evaluate(() => window.copiedText)).toContain("{userId}");
  await page.locator("#joined-teams-userId").fill("demo-user");
  await page.locator("#joined-teams").getByRole("button", { name: "Copy full endpoint" }).click();
  await expect(page.locator("#joined-teams .copy-message")).toHaveText("Full endpoint copied.");
});
test("meeting join URL stays inside the filter and delegated uses /me", async ({ page }) => {
  await page.locator("#meeting-lookup summary").click();
  await page.locator("#meeting-lookup-userId").fill("organizer");
  await page.locator("#meeting-lookup-joinWebUrl").fill("https://teams.microsoft.com/meet/a'b?x=1&y=2");
  const uri = await page.locator("#meeting-lookup pre").innerText();
  expect(new URL(uri).searchParams.get("$filter")).toBe("JoinWebUrl eq 'https://teams.microsoft.com/meet/a''b?x=1&y=2'");
  await page.locator("#route").selectOption("delegated");
  await page.locator("#meeting-lookup summary").click();
  await expect(page.locator("#meeting-lookup pre")).toContainText("/me/onlineMeetings");
  await expect(page.locator("#meeting-lookup-userId")).toHaveCount(0);
});
test("deep links open recipes and recover from restrictive filters", async ({ page }) => {
  await page.goto(url + "#transcript-content");
  await expect(page.locator("#transcript-content")).toHaveAttribute("open", "");
  await page.locator("#cloud").selectOption("china");
  await page.evaluate(() => { window.location.hash = "recordings"; });
  await expect(page.locator("#recordings")).toHaveAttribute("open", "");
  await expect(page.locator("#cloud")).toHaveValue("global");
});
test("keyboard, theme query and text size work", async ({ page }) => {
  await page.goto(url + "?scoutTheme=light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#text-size").selectOption("130");
  await expect(page.locator("html")).toHaveCSS("font-size", "20.8px");
  await page.locator("#joined-teams summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#joined-teams")).toHaveAttribute("open", "");
  await page.keyboard.press("Enter");
  await expect(page.locator("#joined-teams")).not.toHaveAttribute("open", "");
});
test("expanded content is responsive, labelled and free of duplicate IDs", async ({ page }) => {
  await page.locator("#transcript-content summary").click();
  await page.locator("#text-size").selectOption("130");
  const audit = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map(node => node.id);
    const controls = [...document.querySelectorAll("input, select")];
    return {
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      unlabelled: controls.filter(node => !node.labels?.length).map(node => node.id),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1
    };
  });
  expect(audit.duplicateIds).toEqual([]);
  expect(audit.unlabelled).toEqual([]);
  expect(audit.overflow).toBe(false);
});
