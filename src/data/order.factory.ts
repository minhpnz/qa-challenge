import type { OrderDetails } from '../components';

const DEFAULT_ORDER: OrderDetails = {
  name: 'Jane Tester',
  country: 'Vietnam',
  city: 'Ho Chi Minh City',
  creditCard: '4111111111111111',
  month: '12',
  year: '2030',
};

/**
 * One canonical valid order, overridable field by field.
 *
 * Negative cases express intent as a diff from valid (`createOrder({ name: '' })`)
 * rather than as a hand-built object, so a reader can see at a glance which single
 * field the test is actually about.
 */
export function createOrder(overrides: Partial<OrderDetails> = {}): OrderDetails {
  return { ...DEFAULT_ORDER, ...overrides };
}

export const ORDER_EDGE_CASES = {
  longName: 'A'.repeat(256),
  unicodeName: 'Nguyễn Văn Ánh 山田太郎',
  whitespaceOnly: '   ',
  nonNumericCard: 'not-a-card-number',
} as const;
