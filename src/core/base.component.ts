import { expect, type Locator, type Page } from '@playwright/test';

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

  /**
   * Every Bootstrap modal in this app carries TWO controls whose accessible name
   * is "Close": the footer button and the header's ×, which has
   * `aria-label="Close"`. An unscoped `getByRole('button', { name: 'Close' })` is
   * therefore a strict-mode violation in every one of them.
   *
   * These helpers exist so that is a solved problem rather than a trap each new
   * modal falls into: scope by region, and a by-name lookup stays unambiguous.
   */
  protected footerButton(name: string): Locator {
    return this.root.locator('.modal-footer').getByRole('button', { name, exact: true });
  }

  protected headerDismissButton(): Locator {
    return this.root.locator('.modal-header button.close');
  }

  /**
   * Waits for a Bootstrap modal to be genuinely interactive, not merely painted.
   *
   * Bootstrap sets `_isTransitioning` for the duration of the fade, and its
   * `hide()` returns early while that flag is set — so a Close click, or an
   * Escape, landing mid-transition is silently swallowed and the modal simply
   * stays open. That surfaces as "the Close button does not work", intermittently
   * and more often on a loaded CI runner, and is the exact bug a `waitForTimeout`
   * would paper over.
   *
   * Focus is moved onto the dialog at the end of that same transition, so it is
   * the observable signal that the modal is ready. Waiting on the widget's own
   * state is deterministic; a fixed sleep is a guess that is either too short on a
   * slow machine or wasted on a fast one.
   */
  protected async expectModalReady(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.root).toBeFocused();
  }
}
