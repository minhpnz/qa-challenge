import { config } from '../../config';
import { expect, test } from '../../src/fixtures';

/**
 * Performance — API latency budgets.
 *
 * Sampled and reported as p95, not as a mean: a mean hides the tail, and the tail
 * is what users complain about. Sequential by design — a concurrent burst from a
 * test runner measures the runner as much as the service.
 */
test.describe('API latency @performance', () => {
  const samples = config.performance.apiSamples;

  test(`GET /entries p95 over ${samples} samples stays within budget`, async ({
    api,
  }, testInfo) => {
    const durations: number[] = [];

    for (let index = 0; index < samples; index += 1) {
      const started = performance.now();
      const response = await api.get('/entries');
      durations.push(performance.now() - started);
      expect(response.status()).toBe(200);
    }

    const stats = summarise(durations);
    await testInfo.attach('entries-latency', {
      body: JSON.stringify(stats, null, 2),
      contentType: 'application/json',
    });

    expect(stats.p95Ms).toBeWithinBudget(config.performance.apiP95Ms, 'GET /entries p95');
  });

  test('login latency stays within budget', async ({ api, registeredUser }, testInfo) => {
    const durations: number[] = [];

    for (let index = 0; index < Math.min(samples, 10); index += 1) {
      const started = performance.now();
      await api.loginOrThrow(registeredUser);
      durations.push(performance.now() - started);
    }

    const stats = summarise(durations);
    await testInfo.attach('login-latency', {
      body: JSON.stringify(stats, null, 2),
      contentType: 'application/json',
    });

    expect(stats.p95Ms).toBeWithinBudget(config.performance.apiP95Ms, 'POST /login p95');
  });
});

function summarise(durations: number[]): {
  samples: number;
  minMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
} {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    samples: sorted.length,
    minMs: round(sorted[0] ?? 0),
    medianMs: round(percentile(sorted, 50)),
    p95Ms: round(percentile(sorted, 95)),
    maxMs: round(sorted.at(-1) ?? 0),
  };
}

/** Nearest-rank percentile — no interpolation, so small samples stay honest. */
function percentile(sorted: number[], percent: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((percent / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1] ?? 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
