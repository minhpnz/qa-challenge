// Captures the README's report images from a real run, inside the container.
// Regenerating them is a command, not a manual screenshot session — a README
// image nobody can reproduce quietly goes stale and starts lying about the suite.
// Driven by scripts/capture-report-images.sh.
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:9323', { waitUntil: 'networkidle' });
  await page.waitForSelector('.test-file-test', { timeout: 20000 });
  await page.screenshot({ path: '/out/report-overview.png', fullPage: true });

  // Drill into one test to show steps, attachments and the trace link.
  const link = page.locator('.test-file-test a', { hasText: 'completes an order' }).first();
  if (await link.count()) {
    await link.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: '/out/report-test-detail.png', fullPage: true });
  }
  await browser.close();
})();
