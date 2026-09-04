import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { ENVIRONMENTS, type EnvironmentName, type EnvironmentProfile } from './environments';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Typed, validated runtime configuration.
 *
 * Every knob is resolved exactly once, here, and fails loudly at load time if it
 * is malformed. The alternative — `process.env.X` sprinkled through specs — turns
 * a typo into a silently-skipped assertion, which is the worst failure mode a
 * test suite can have.
 */

function readString(key: string, fallback: string): string {
  const raw = process.env[key];
  return raw === undefined || raw.trim() === '' ? fallback : raw.trim();
}

function readNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Config error: ${key}="${raw}" is not a positive number.`);
  }
  return parsed;
}

function readOptionalNumber(key: string): number | undefined {
  const raw = process.env[key];
  return raw === undefined || raw.trim() === '' ? undefined : readNumber(key, 0);
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const normalised = raw.trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(normalised)) return true;
  if (['0', 'false', 'no'].includes(normalised)) return false;
  throw new Error(`Config error: ${key}="${raw}" is not a boolean.`);
}

function readEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const raw = readString(key, fallback);
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new Error(`Config error: ${key}="${raw}". Allowed: ${allowed.join(' | ')}`);
  }
  return raw as T;
}

const environmentName = readEnum<EnvironmentName>(
  'TEST_ENV',
  ['local', 'staging', 'production'],
  'production',
);

const profile: EnvironmentProfile = ENVIRONMENTS[environmentName];

export const CI = readBoolean('CI', false);

export const config = {
  env: environmentName,
  /** Per-run override wins over the profile, so a preview URL needs no code change. */
  baseUrl: readString('BASE_URL', profile.baseUrl),
  apiBaseUrl: readString('API_BASE_URL', profile.apiBaseUrl),
  readOnly: profile.readOnly,

  headless: readBoolean('HEADLESS', true),
  workers: readOptionalNumber('WORKERS') ?? (CI ? 4 : undefined),
  retries: readOptionalNumber('RETRIES') ?? (CI ? 2 : 0),

  timeouts: {
    action: readNumber('ACTION_TIMEOUT_MS', 10_000),
    expect: readNumber('EXPECT_TIMEOUT_MS', 7_000),
    test: readNumber('TEST_TIMEOUT_MS', 60_000),
    navigation: readNumber('NAVIGATION_TIMEOUT_MS', 30_000),
  },

  artifacts: {
    trace: readEnum(
      'TRACE',
      ['on', 'off', 'retain-on-failure', 'on-first-retry'],
      'on-first-retry',
    ),
    video: readEnum(
      'VIDEO',
      ['on', 'off', 'retain-on-failure', 'on-first-retry'],
      'retain-on-failure',
    ),
    screenshot: readEnum('SCREENSHOT', ['on', 'off', 'only-on-failure'], 'only-on-failure'),
  },

  users: {
    /** Ephemeral accounts are generated per test; only the shared password is config. */
    password: readString('TEST_USER_PASSWORD', 'Passw0rd!QA'),
  },

  performance: {
    ttfbMs: readNumber('PERF_BUDGET_TTFB_MS', 1_500),
    domContentLoadedMs: readNumber('PERF_BUDGET_DOM_CONTENT_LOADED_MS', 4_000),
    pageLoadMs: readNumber('PERF_BUDGET_PAGE_LOAD_MS', 6_000),
    apiP95Ms: readNumber('PERF_BUDGET_API_P95_MS', 1_500),
    apiSamples: readNumber('PERF_API_SAMPLES', 20),
  },
} as const;

export type FrameworkConfig = typeof config;
export type { EnvironmentName, EnvironmentProfile };
