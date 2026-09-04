import { expect as baseExpect } from '@playwright/test';

/**
 * A custom matcher earns its place when it makes a failure message better, not
 * merely when it makes the call site shorter. `expect(1832).toBeLessThan(1500)`
 * tells a triager nothing; this tells them which budget, by how much, and in
 * units they can act on.
 */
export const expect = baseExpect.extend({
  toBeWithinBudget(actualMs: number, budgetMs: number, label = 'measurement') {
    const pass = actualMs <= budgetMs;
    const overBy = (actualMs - budgetMs).toFixed(0);
    const percent = ((actualMs / budgetMs - 1) * 100).toFixed(1);
    return {
      pass,
      name: 'toBeWithinBudget',
      expected: budgetMs,
      actual: actualMs,
      message: () =>
        pass
          ? `Expected ${label} (${actualMs.toFixed(0)}ms) to exceed its ${budgetMs}ms budget, but it did not.`
          : `${label} took ${actualMs.toFixed(0)}ms, exceeding its ${budgetMs}ms budget by ${overBy}ms (+${percent}%).`,
    };
  },
});
