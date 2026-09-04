import { expect, test as setup } from '@playwright/test';
import { config } from '../../config';

/**
 * A gate, not a test.
 *
 * When DemoBlaze is down or slow, a suite without this reports ~200 unrelated
 * UI timeouts and someone spends an hour triaging an outage. With it, the run
 * stops in two seconds with a message naming the environment and the failing
 * dependency. Cheap, and it is the difference between a trusted signal and a
 * suite people learn to ignore.
 */
setup.describe('environment health', () => {
  setup('web and API endpoints are reachable @smoke', async ({ request }) => {
    const web = await request.get(config.baseUrl);
    expect(web.status(), `Web app unreachable at ${config.baseUrl}`).toBe(200);

    const api = await request.get(`${config.apiBaseUrl}/entries`);
    expect(api.status(), `API unreachable at ${config.apiBaseUrl}`).toBe(200);

    const body = (await api.json()) as { Items?: unknown[] };
    expect(
      body.Items?.length ?? 0,
      'Catalogue is empty — test data assumptions break',
    ).toBeGreaterThan(0);
  });
});
