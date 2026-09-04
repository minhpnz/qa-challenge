import type { Page, Response } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Base for full pages (something with its own URL).
 *
 * Deliberately thin. A fat base class is how page objects rot: everything ends up
 * here because it is convenient, and the class becomes a second, untested utility
 * library. The only things that belong at this level are navigation and the
 * "is this page actually loaded" contract every page must implement.
 */
export abstract class BasePage {
  protected constructor(
    public readonly page: Page,
    /** Path relative to baseURL, e.g. `/cart.html`. */
    protected readonly path: string,
  ) {}

  async goto(): Promise<Response | null> {
    return this.page.goto(this.path);
  }

  /**
   * Resolves when the page is usable, not merely when the network settled.
   * Subclasses assert on a DOM anchor that only exists once the page's own
   * bootstrap JS has run — DemoBlaze renders its catalogue client-side, so
   * `load` alone means nothing.
   */
  abstract expectLoaded(): Promise<void>;

  async expectPath(expected: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(
      typeof expected === 'string' ? new RegExp(`${escapeRegExp(expected)}`) : expected,
    );
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
