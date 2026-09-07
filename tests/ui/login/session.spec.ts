import { expect, test } from '../../../src/fixtures';
import { CartPage, HomePage } from '../../../src/pages';
import { LoginModal, NavBar } from '../../../src/components';

/**
 * Session lifecycle: what survives, what must not, and what happens when the
 * thing holding the session is taken away.
 *
 * Documented as manual on the assumption that browser chrome and cookie
 * manipulation need a person. Playwright owns both — `context.clearCookies()`,
 * `page.goBack()` and `browser.newContext()` are first-class — so leaving these
 * unautomated was a choice, not a constraint.
 */
test.describe('Session', () => {
  test('survives a page refresh @regression', async ({ page, navBar, loggedInUser }) => {
    await page.reload();

    await navBar.expectLoggedInAs(loggedInUser.username);
  });

  test('shows the anonymous state on the cart page after logging out @regression', async ({
    navBar,
    cartPage,
    loggedInUser,
  }) => {
    expect(loggedInUser.username).not.toBe('');
    await navBar.logout();

    await cartPage.goto();
    await cartPage.expectLoaded();
    await navBar.expectLoggedOut();
  });

  test('ends when the session cookie is cleared @regression', async ({
    page,
    context,
    navBar,
    loggedInUser,
  }) => {
    expect(loggedInUser.username).not.toBe('');

    await context.clearCookies();
    await page.reload();

    // No stale authenticated chrome rendered from a cache.
    await navBar.expectLoggedOut();
  });

  test('is not restored by the browser back button after logout @regression', async ({
    page,
    navBar,
    loggedInUser,
  }) => {
    expect(loggedInUser.username).not.toBe('');
    await navBar.logout();

    // Deliberately NOT `page.goBack()`. That call waits for a navigation it can
    // observe, and a back step served from the back-forward cache does not always
    // surface one — so it sat until its 30s timeout and failed roughly one run in
    // three, having never reached the assertion. Neither `'load'` nor `'commit'`
    // fixed it, because the problem is waiting for a lifecycle event that may
    // never fire, not which event we wait for.
    //
    // What this test actually cares about is the state the user is left in. So
    // the back step is triggered in the page and scheduled on a macrotask — which
    // lets `evaluate` return before the navigation tears down its execution
    // context — and the web-first assertion below retries until the page settles.
    await page.evaluate(() => {
      window.setTimeout(() => window.history.back(), 0);
    });

    // A restored bfcache page must not present a logged-in header.
    await navBar.expectLoggedOut();
  });

  test('supports the same account in two independent browser sessions @regression', async ({
    browser,
    navBar,
    loggedInUser,
  }) => {
    await navBar.expectLoggedInAs(loggedInUser.username);

    const second = await browser.newContext();
    try {
      const page = await second.newPage();
      const home = new HomePage(page);
      const nav = new NavBar(page);
      const login = new LoginModal(page);

      await home.goto();
      await home.expectLoaded();
      await nav.openLogin();
      await login.login(loggedInUser);

      // Both sessions are valid at once; neither invalidates the other.
      await nav.expectLoggedInAs(loggedInUser.username);
      await navBar.expectLoggedInAs(loggedInUser.username);
    } finally {
      await second.close();
    }
  });

  test('a malformed auth token does not expose cart data @regression', async ({
    page,
    context,
    loggedInUser,
  }) => {
    expect(loggedInUser.username).not.toBe('');
    await context.addCookies([
      { name: 'tokenp_', value: 'not-a-real-token', url: 'https://www.demoblaze.com' },
    ]);

    const cart = new CartPage(page);
    await page.goto('/cart.html');

    // The page must not render another account's lines. Navigation is done
    // directly rather than through CartPage.goto(), which waits for a successful
    // /viewcart — the whole point here is that the call fails.
    await cart.expectLoaded();
    await cart.expectEmpty();
  });

  test('login failure is silent when the API is unreachable @regression @bug', async ({
    page,
    homePage,
    navBar,
    loginModal,
    dialogs,
    registeredUser,
  }) => {
    // KNOWN DEFECT (DEMO-13). The app's $.ajax call defines a success handler and
    // no error handler, so a failed request produces no feedback at all — the
    // modal simply sits there, indistinguishable from an unclicked button.
    // Fault injection is exactly what page.route() is for; this needed no human.
    test.fail();
    await page.route('https://api.demoblaze.com/login', (route) => route.abort());

    await homePage.goto();
    await homePage.expectLoaded();
    await navBar.openLogin();
    await loginModal.login(registeredUser);

    await expect
      .poll(() => dialogs.count, { timeout: 5000, message: 'the user was told nothing' })
      .toBeGreaterThan(0);
  });
});
