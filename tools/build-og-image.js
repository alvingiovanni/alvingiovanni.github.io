#!/usr/bin/env node
/**
 * Renders tools/og-image.html to assets/og-image.png (1200×630) — the image a
 * pasted link shows on LinkedIn, Slack, iMessage, and the rest.
 *
 *   npm i -g playwright && npx playwright install chromium   (once)
 *   node tools/build-og-image.js
 *
 * Needs a network connection the first time for the Space Grotesk web font;
 * falls back to the system font otherwise.
 */
const path = require("path");
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  ({ chromium } = require("/opt/node22/lib/node_modules/playwright"));
}

(async () => {
  const root = path.resolve(__dirname, "..");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(root, "tools", "og-image.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = path.join(root, "assets", "og-image.png");
  await page.screenshot({ path: out, type: "png" });
  await browser.close();
  console.log("wrote " + path.relative(root, out));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
