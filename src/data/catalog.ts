import type { Category } from '../api/types';

/**
 * Catalogue anchors used by UI tests.
 *
 * These are the only hardcoded product facts in the suite, and they are titles —
 * deliberately not ids and not prices. Ids and prices are resolved from the API at
 * runtime: a hardcoded price is a test that fails the day marketing runs a
 * promotion, and a hardcoded id is a test that breaks when the catalogue is
 * reordered. Both train a team to ignore red builds, which is the expensive
 * failure mode.
 */
export const PRODUCTS = {
  phone: { title: 'Samsung galaxy s6', category: 'phone' as Category },
  laptop: { title: 'Sony vaio i5', category: 'notebook' as Category },
  monitor: { title: 'Apple monitor 24', category: 'monitor' as Category },
} as const;

export const CATEGORIES: readonly Category[] = ['phone', 'notebook', 'monitor'];
