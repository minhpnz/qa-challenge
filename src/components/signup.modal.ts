import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core';
import type { Credentials } from '../api/types';

export class SignupModal extends BaseComponent {
  readonly username: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page, page.locator('#signInModal'));
    this.username = this.root.locator('#sign-username');
    this.password = this.root.locator('#sign-password');
    this.submitButton = this.root.getByRole('button', { name: 'Sign up', exact: true });
  }

  async expectOpen(): Promise<void> {
    await this.expectModalReady();
    await expect(this.submitButton).toBeEnabled();
  }

  async signup({ username, password }: Credentials): Promise<void> {
    await this.expectOpen();
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submitButton.click();
  }
}
