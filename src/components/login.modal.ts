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
    // Scoped to the footer: the header's 'x' carries aria-label="Close" too, so an
    // unscoped by-name lookup matches two elements and fails strict mode.
    this.closeButton = this.root
      .locator('.modal-footer')
      .getByRole('button', { name: 'Close', exact: true });
    // The header 'x'. Distinct control from the footer's Close button, and users
    // reach for it far more often, so it deserves its own coverage.
    this.dismissButton = this.root.locator('.modal-header button.close');
  }

  /**
   * Bootstrap fades the modal in. Asserting the *submit button* is enabled — not
   * merely that the container exists — is what makes the following `fill` safe
   * without a sleep.
   */
  async expectOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
    // Bootstrap moves focus onto the dialog when the fade finishes, and only then
    // is its own keydown handler live. Pressing Escape before that point is
    // silently dropped — which looked like "Escape does not close the modal" and
    // is really a test racing the transition. Focus is the widget's own readiness
    // signal, so waiting on it is deterministic where a fixed sleep is not.
    await expect(this.root).toBeFocused();
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
