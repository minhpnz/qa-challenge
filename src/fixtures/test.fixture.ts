import { test as base } from '@playwright/test';
import { config } from '../../config';
import { DemoblazeApiClient } from '../api';
import { LoginModal, NavBar, PurchaseConfirmation, SignupModal } from '../components';
import { DialogWatcher, expect, logger } from '../core';
import { createTestUser, type TestUser } from '../data';
import { CartPage, HomePage, ProductPage } from '../pages';

/**
 * The fixture layer is the framework's real API surface.
 *
 * A spec should declare what it needs — `{ cartPage, loggedInUser }` — and receive
 * it already constructed, already asserted, already scheduled for cleanup. Two
 * things follow from that, and both are the point:
 *
 *  1. Specs contain no setup. No `new HomePage(page)`, no login steps copied
 *     between files, no `beforeEach` chains that a reader has to reconstruct.
 *  2. Setup changes in one place. When login gains a captcha, one fixture changes
 *     and 40 specs keep passing.
 */
export interface TestFixtures {
  api: DemoblazeApiClient;
  dialogs: DialogWatcher;

  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  navBar: NavBar;
  loginModal: LoginModal;
  signupModal: SignupModal;
  purchaseConfirmation: PurchaseConfirmation;

  /** A brand-new account, created through the API. Never reused across tests. */
  registeredUser: TestUser;
  /** API auth token for `registeredUser` — used to seed and inspect cart state. */
  authToken: string;
  /** `registeredUser`, logged in through the UI, sitting on the home page. */
  loggedInUser: TestUser;
}

export const test = base.extend<TestFixtures>({
  api: async ({ request }, use) => {
    await use(new DemoblazeApiClient(request, config.apiBaseUrl));
  },

  // Auto-armed for every test: DemoBlaze raises native alerts on paths a test may
  // not expect, and an unhandled dialog silently changes behaviour. Owning the
  // handler globally makes dialog messages assertable instead of invisible.
  dialogs: async ({ page }, use) => {
    const watcher = new DialogWatcher(page);
    await use(watcher);
    watcher.dispose();
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  navBar: async ({ page }, use) => {
    await use(new NavBar(page));
  },
  loginModal: async ({ page }, use) => {
    await use(new LoginModal(page));
  },
  signupModal: async ({ page }, use) => {
    await use(new SignupModal(page));
  },
  purchaseConfirmation: async ({ page }, use) => {
    await use(new PurchaseConfirmation(page));
  },

  registeredUser: async ({ api }, use, testInfo) => {
    const user = createTestUser();
    await test.step(`Register ephemeral user "${user.username}"`, async () => {
      await api.signupOrThrow(user);
    });
    // Attached, not logged: a triager opening the HTML report for a failed run
    // needs the account name, and attachments survive where stdout does not.
    await testInfo.attach('test-user', { body: user.username, contentType: 'text/plain' });

    await use(user);

    // Best-effort teardown. DemoBlaze cannot delete accounts, so the cart is the
    // only state we can hand back clean. A teardown failure must never fail a
    // test that already passed — that turns cleanup noise into false red builds.
    try {
      const token = await api.loginOrThrow(user);
      await api.clearCart(token);
    } catch (error) {
      logger.warn('Cart teardown failed (non-fatal)', {
        user: user.username,
        error: (error as Error).message,
      });
    }
  },

  authToken: async ({ api, registeredUser }, use) => {
    await use(await api.loginOrThrow(registeredUser));
  },

  // No logout in teardown: the browser context is discarded after every test, so
  // logging out would only add a flake surface for zero isolation gain.
  loggedInUser: async ({ homePage, loginModal, navBar, registeredUser }, use) => {
    await test.step(`Log in as "${registeredUser.username}" via the UI`, async () => {
      await homePage.goto();
      await homePage.expectLoaded();
      await navBar.openLogin();
      await loginModal.login(registeredUser);
      // Order matters: the welcome label only exists after the app's post-login
      // reload, so asserting it first is what makes the modal check race-free.
      await navBar.expectLoggedInAs(registeredUser.username);
      await loginModal.expectClosed();
    });
    await use(registeredUser);
  },
});

export { expect };
