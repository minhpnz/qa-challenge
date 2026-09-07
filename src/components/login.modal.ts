import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core';
import type { Credentials } from '../api/types';

export class LoginModal extends BaseComponent {
  readonly username: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;
  readonly dismissButton: Locator;

  constructor(page: Page) {
    super(page, page.locator('#logInModal'));
    this.username = this.root.locator('#loginusername');
    this.password = this.root.locator('#loginpassword');
    this.submitButton = this.root.getByRole('button', { name: 'Log in', exact: true });
    this.closeButton = this.footerButton('Close');
    // The header '×'. A distinct control from the footer's Close button, and the
    // one users reach for more often, so it earns its own coverage.
    this.dismissButton = this.headerDismissButton();
  }

  /**
   * Bootstrap fades the modal in. Asserting the *submit button* is enabled — not
   * merely that the container exists — is what makes the following `fill` safe
   * without a sleep.
   */
  async expectOpen(): Promise<void> {
    await this.expectModalReady();
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

  async pressEscape(): Promise<void> {
    await this.root.press('Escape');
  }

  /**
   * Bootstrap dismisses only when the click target is the modal container itself,
   * never the dialog inside it. The point is computed from the dialog's own box —
   * halfway up, in the gutter to its left — so it stays correct on any viewport,
   * including the mobile projects where a hardcoded corner would land differently.
   *
   * A raw mouse click, not `locator.click({ position })`: the latter runs
   * actionability checks against the container, which spans the viewport and is
   * considered obscured by the dialog it contains.
   */
  async clickOutside(): Promise<void> {
    const box = await this.root.locator('.modal-dialog').boundingBox();
    if (!box) throw new Error('Login dialog has no bounding box — is the modal open?');
    await this.page.mouse.click(Math.max(2, box.x / 2), box.y + box.height / 2);
  }

  async login(credentials: Credentials): Promise<void> {
    await this.expectOpen();
    await this.fillCredentials(credentials);
    await this.submit();
  }
}
