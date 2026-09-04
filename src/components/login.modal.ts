import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core';
import type { Credentials } from '../api/types';

export class LoginModal extends BaseComponent {
  readonly username: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page, page.locator('#logInModal'));
    this.username = this.root.locator('#loginusername');
    this.password = this.root.locator('#loginpassword');
    this.submitButton = this.root.getByRole('button', { name: 'Log in', exact: true });
    this.closeButton = this.root.getByRole('button', { name: 'Close', exact: true });
  }

  /**
   * Bootstrap fades the modal in. Asserting the *submit button* is enabled — not
   * merely that the container exists — is what makes the following `fill` safe
   * without a sleep.
   */
  async expectOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Only meaningful *after* the caller has confirmed the session started.
   *
   * On success the AUT hides the modal and immediately calls `location.reload()`.
   * Those two race, and on WebKit the reload regularly wins — leaving the old
   * document's modal still carrying Bootstrap's `.show` class for long enough to
   * fail a naive "modal is closed" check. Asserting the logged-in state first
   * (which cannot be true before the reload) removes the race entirely.
   */
  async expectClosed(): Promise<void> {
    await expect(this.root).toBeHidden();
  }

  async fillCredentials({ username, password }: Credentials): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(credentials: Credentials): Promise<void> {
    await this.expectOpen();
    await this.fillCredentials(credentials);
    await this.submit();
  }
}
