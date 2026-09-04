import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core';

/** Site-wide header. Present on every page, so it is a component, not a page. */
export class NavBar extends BaseComponent {
  readonly home: Locator;
  readonly cart: Locator;
  readonly loginLink: Locator;
  readonly signupLink: Locator;
  readonly logoutLink: Locator;
  readonly welcomeLabel: Locator;

  constructor(page: Page) {
    super(page, page.locator('#navbarExample'));
    this.home = page.locator('#nava');
    this.cart = page.locator('#cartur');
    this.loginLink = page.locator('#login2');
    this.signupLink = page.locator('#signin2');
    this.logoutLink = page.locator('#logout2');
    this.welcomeLabel = page.locator('#nameofuser');
  }

  async openLogin(): Promise<void> {
    await this.loginLink.click();
  }

  async openSignup(): Promise<void> {
    await this.signupLink.click();
  }

  async openCart(): Promise<void> {
    await this.cart.click();
  }

  /**
   * Logging out sets `location.href`, so the click starts a navigation. Returning
   * before it lands leaves the next action racing a page teardown — the classic
   * "element found, then detached" flake. The wait belongs here, once, not in
   * every test that logs out.
   */
  async logout(): Promise<void> {
    await this.logoutLink.click();
    await this.page.waitForURL(/index\.html/);
    await expect(this.loginLink).toBeVisible();
  }

  /**
   * The authenticated/anonymous distinction is asserted through the nav bar rather
   * than through storage internals: it is what a user can actually observe, and it
   * survives the app changing how it persists its session.
   */
  async expectLoggedInAs(username: string): Promise<void> {
    await expect(this.welcomeLabel).toHaveText(`Welcome ${username}`);
    await expect(this.logoutLink).toBeVisible();
    await expect(this.loginLink).toBeHidden();
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.loginLink).toBeVisible();
    await expect(this.signupLink).toBeVisible();
    await expect(this.logoutLink).toBeHidden();
    await expect(this.welcomeLabel).toBeHidden();
  }
}
