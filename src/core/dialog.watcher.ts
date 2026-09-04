import type { Dialog, Page } from '@playwright/test';

/**
 * DemoBlaze reports most outcomes through native `window.alert` — login failures,
 * "Product added.", signup errors. Playwright auto-dismisses dialogs when nothing
 * is listening, so those messages are lost and the test can only assert on
 * side effects.
 *
 * Why a persistent watcher and not `page.waitForEvent('dialog')`:
 * `waitForEvent` has to be armed around the exact action, and while it is pending
 * the triggering `click()` can block on the open dialog — a classic source of
 * intermittent 30s timeouts. Registering one handler for the page's whole lifetime
 * removes the race entirely: dialogs are always handled immediately, and the test
 * reads the recorded message afterwards.
 */
export class DialogWatcher {
  private readonly recorded: string[] = [];
  private readonly handler: (dialog: Dialog) => Promise<void>;

  constructor(
    private readonly page: Page,
    private readonly accept = true,
  ) {
    this.handler = async (dialog: Dialog): Promise<void> => {
      this.recorded.push(dialog.message());
      await (this.accept ? dialog.accept() : dialog.dismiss());
    };
    this.page.on('dialog', this.handler);
  }

  /** Every dialog message seen so far, oldest first. */
  get messages(): readonly string[] {
    return [...this.recorded];
  }

  get last(): string | undefined {
    return this.recorded.at(-1);
  }

  get count(): number {
    return this.recorded.length;
  }

  clear(): void {
    this.recorded.length = 0;
  }

  dispose(): void {
    this.page.off('dialog', this.handler);
  }
}
