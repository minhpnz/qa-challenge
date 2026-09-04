import { randomUUID } from 'node:crypto';
import { config } from '../../config';
import type { Credentials } from '../api/types';

export interface TestUser extends Credentials {
  readonly username: string;
  readonly password: string;
}

/**
 * DemoBlaze has no test-data API and no way to delete an account, and a cart is
 * server-side state keyed to a user. Two tests sharing one account therefore share
 * a cart — which is exactly how suites acquire order-dependent, parallel-hostile
 * flake.
 *
 * The cheapest correct answer is a globally unique account per test. A UUID
 * suffix (not a counter, not a timestamp alone) keeps that true across parallel
 * workers, sharded CI runs, and two branches building at the same second.
 *
 * In a system we controlled, this would instead be a seeded pool with an API
 * teardown; the trade-off is written up in README §Test data.
 */
export function createTestUser(prefix = 'pw'): TestUser {
  return {
    username: `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    password: config.users.password,
  };
}

/** Credentials for an account that is guaranteed not to exist. */
export function unknownUser(): TestUser {
  return { username: `ghost_${randomUUID().slice(0, 12)}`, password: config.users.password };
}
