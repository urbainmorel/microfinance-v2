import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

async function run() {
  let browser;
  try {
    browser = await chromium.launch();
    console.log("Chromium launched successfully!");
  } catch (err) {
    console.log("Chromium failed, trying msedge...", err.message);
    browser = await chromium.launch({ channel: "msedge" });
  }

  const outDir = "C:/Users/DELL/.gemini/antigravity/brain/96194b1e-0b7b-4d13-b6df-8d9c8c946b82";
  const localDir = path.resolve("audit-screenshots");
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });

  // 1. Desktop full & hero
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://localhost:3001", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1000);

  async function snap(page, filename, options = {}) {
    await page.screenshot({ path: path.join(localDir, filename), ...options });
    await page.screenshot({ path: path.join(outDir, filename), ...options });
  }

  await snap(desktopPage, "desktop-hero-new.png");
  await snap(desktopPage, "desktop-full-new.png", { fullPage: true });
  console.log("Desktop new screenshots captured!");

  // 1.5 Tablet 768px
  const tabletContext = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
  });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto("http://localhost:3001", { waitUntil: "networkidle" });
  await tabletPage.waitForTimeout(1000);
  await snap(tabletPage, "tablet-hero-new.png");
  console.log("Tablet screenshot captured!");

  // 2. Mobile 390px
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3001", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);

  await snap(mobilePage, "mobile-hero-new.png");
  await mobilePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await mobilePage.waitForTimeout(500);
  await mobilePage.evaluate(() => window.scrollTo(0, 0));
  await mobilePage.waitForTimeout(300);
  await snap(mobilePage, "mobile-full-new.png", { fullPage: true });

  // Click burger to capture opened mobile menu!
  const menuButton = mobilePage.locator('button[aria-label="Ouvrir le menu de navigation"]');
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await mobilePage.waitForTimeout(500);
    await snap(mobilePage, "mobile-menu-opened.png");
    console.log("Mobile menu opened screenshot captured!");
  }

  // 3. Mobile small (360px)
  const mobileSmallContext = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobileSmallPage = await mobileSmallContext.newPage();
  await mobileSmallPage.goto("http://localhost:3001", { waitUntil: "networkidle" });
  await mobileSmallPage.waitForTimeout(1000);

  await snap(mobileSmallPage, "mobile-360-header-new.png");
  console.log("Mobile 360 new screenshot captured!");

  await browser.close();
  console.log("All new screenshots captured!");
}

run().catch((e) => {
  console.error("Run error:", e);
  process.exit(1);
});
