import type { Locator, Page } from '@playwright/test';

/**
 * Base for components — things that appear on many pages (nav bar) or are not
 * pages at all (Bootstrap modals, SweetAlert dialogs).
 *
 * Modelling these separately from pages is what keeps the object layer additive:
 * the login modal is reachable from the home page, the cart page and the product
 * page, and it is defined exactly once.
 */
export abstract class BaseComponent {
  protected constructor(
    public readonly page: Page,
    /** The component's own subtree. All locators are scoped to it. */
    public readonly root: Locator,
  ) {}

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }
}
