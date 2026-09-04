import { config } from '../../config';
import { expect, test } from '../../src/fixtures';

interface NavigationMetrics {
  ttfbMs: number;
  domContentLoadedMs: number;
  loadMs: number;
  transferredBytes: number;
}

/**
 * Performance — front-end budgets.
 *
 * Scope, stated honestly: this is *budget regression testing on a single client*,
 * not load testing. It answers "did this change make the page slower for one
 * user", which is the question a functional pipeline can answer cheaply and
 * repeatedly. Throughput and concurrency belong in k6 against a dedicated
 * environment — see README §Performance for where that boundary sits and why
 * putting load tests in Playwright produces numbers nobody should trust.
 *
 * Budgets are configuration (PERF_BUDGET_*), so a team can tighten them without
 * touching a spec, and CI can run looser budgets than a developer's laptop.
 */
test.describe('Performance budgets @performance', () => {
  const pages = [
    { name: 'home', path: '/index.html' },
    { name: 'product', path: '/prod.html?idp_=1' },
    { name: 'cart', path: '/cart.html' },
  ] as const;

  for (const target of pages) {
    test(`${target.name} page loads within budget`, async ({ page }, testInfo) => {
      await page.goto(target.path, { waitUntil: 'load' });

      const metrics = await page.evaluate<NavigationMetrics>(() => {
        const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (!nav) throw new Error('No navigation timing entry available.');
        return {
          ttfbMs: nav.responseStart - nav.requestStart,
          domContentLoadedMs: nav.domContentLoadedEventEnd - nav.startTime,
          loadMs: nav.loadEventEnd - nav.startTime,
          transferredBytes: nav.transferSize,
        };
      });

      // Attached so a regression can be diffed run-over-run from the HTML report
      // instead of being reconstructed from a failure message.
      await testInfo.attach(`metrics-${target.name}`, {
        body: JSON.stringify(metrics, null, 2),
        contentType: 'application/json',
      });

      expect(metrics.ttfbMs).toBeWithinBudget(config.performance.ttfbMs, `${target.name} TTFB`);
      expect(metrics.domContentLoadedMs).toBeWithinBudget(
        config.performance.domContentLoadedMs,
        `${target.name} DOMContentLoaded`,
      );
      expect(metrics.loadMs).toBeWithinBudget(
        config.performance.pageLoadMs,
        `${target.name} load event`,
      );
    });
  }

  test('catalogue becomes interactive within the page-load budget', async ({ homePage }) => {
    // A user-perceived measure rather than a browser event: the clock stops when
    // the first product is actually on screen. `load` can fire on a blank page.
    const started = Date.now();
    await homePage.goto();
    await homePage.expectLoaded();
    const elapsed = Date.now() - started;

    expect(elapsed).toBeWithinBudget(config.performance.pageLoadMs, 'time to first product card');
  });
});
