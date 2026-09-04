/**
 * Environment profiles.
 *
 * Why a profile map instead of "just read BASE_URL from env": adding an
 * environment must be a data change, not a code change, and every environment
 * must be described in one place a reviewer can diff. Individual values stay
 * overridable per run (see config/index.ts) for one-off targets like a preview URL.
 */
export type EnvironmentName = 'local' | 'staging' | 'production';

export interface EnvironmentProfile {
  readonly name: EnvironmentName;
  readonly baseUrl: string;
  readonly apiBaseUrl: string;
  /** Environments we must never mutate destructively. Guards live in fixtures. */
  readonly readOnly: boolean;
}

export const ENVIRONMENTS: Record<EnvironmentName, EnvironmentProfile> = {
  local: {
    name: 'local',
    baseUrl: 'http://localhost:3000',
    apiBaseUrl: 'http://localhost:3001',
    readOnly: false,
  },
  staging: {
    name: 'staging',
    baseUrl: 'https://www.demoblaze.com',
    apiBaseUrl: 'https://api.demoblaze.com',
    readOnly: false,
  },
  production: {
    name: 'production',
    baseUrl: 'https://www.demoblaze.com',
    apiBaseUrl: 'https://api.demoblaze.com',
    readOnly: false,
  },
};
