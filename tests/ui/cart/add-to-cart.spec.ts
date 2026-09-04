import { expect, test } from '../../../src/fixtures';
import { PRODUCTS } from '../../../src/data';

/**
 * Cart — add, inspect, remove.
 *
 * Expected prices come from the API at runtime, never from a constant. A suite
 * that hardcodes `360` goes red the day someone runs a promotion, and a suite
 * that goes red for non-defect reasons stops being read.
 */
test.describe('Cart', () => {
  // Every test in this file starts from a fresh, logged-in account. Stating that
  // precondition once, here, keeps the start state visible without repeating a
  // fixture in every signature — and fails with a clear message if the session
  // ever stops being established.
  test.beforeEach(async ({ navBar, loggedInUser }) => {
    await navBar.expectLoggedInAs(loggedInUser.username);
  });

  test('adds a product to the cart and shows it with the right price @smoke @regression', async ({
    api,
    productPage,
    cartPage,
    dialogs,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);

    await productPage.gotoProduct(product.id);
    await productPage.expectLoaded();
    expect(await productPage.readPrice()).toBe(product.price);

    await productPage.addToCart();
    await expect.poll(() => dialogs.last).toBe('Product added.');

    await cartPage.goto();
    await cartPage.expectLoaded();
    await cartPage.expectContains(product.title);
    await cartPage.expectTotal(product.price);
  });

  test('sums multiple different products into the displayed total @regression', async ({
    api,
    productPage,
    cartPage,
    dialogs,
  }) => {
    const chosen = [PRODUCTS.phone.title, PRODUCTS.laptop.title, PRODUCTS.monitor.title];
    const products = await Promise.all(chosen.map((title) => api.findProductByTitle(title)));

    for (const product of products) {
      await productPage.gotoProduct(product.id);
      await productPage.expectLoaded();
      // Reset before each add. Polling `dialogs.last` across a loop would match
      // the PREVIOUS iteration's identical message and return immediately — the
      // test would then navigate away before the add actually completed, and
      // arrive at a cart with a missing line. That failure looks like an app bug
      // and is entirely a test bug; clearing makes the wait mean what it says.
      dialogs.clear();
      await productPage.addToCart();
      await expect.poll(() => dialogs.last).toBe('Product added.');
    }

    await cartPage.goto();
    await cartPage.expectLoaded();
    await expect(cartPage.rows).toHaveCount(products.length);

    const expectedTotal = products.reduce((sum, product) => sum + product.price, 0);
    await cartPage.expectTotal(expectedTotal);
    // The invariant that actually matters: the headline total agrees with the
    // lines a customer can see. A total computed from a stale server response
    // would still equal the API sum, but not this.
    expect(await cartPage.sumOfLines()).toBe(expectedTotal);
  });

  test('allows the same product to be added twice as two lines @regression', async ({
    api,
    productPage,
    cartPage,
    dialogs,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await productPage.gotoProduct(product.id);
      await productPage.expectLoaded();
      await productPage.addToCart();
      // Counting, not matching: both adds emit the same text, so only the arrival
      // of an Nth dialog proves the Nth add happened.
      await expect.poll(() => dialogs.count).toBe(attempt + 1);
    }

    await cartPage.goto();
    await cartPage.expectLoaded();
    // Pinned behaviour, not endorsed behaviour: DemoBlaze has no quantity column,
    // so a repeat add duplicates the line. If the app ever introduces quantities,
    // this test fails and forces an explicit decision.
    await cartPage.expectContains(product.title, 2);
    await cartPage.expectTotal(product.price * 2);
  });

  test('removes a line and recalculates the total @regression', async ({
    api,
    authToken,
    cartPage,
  }) => {
    const [phone, laptop] = await Promise.all([
      api.findProductByTitle(PRODUCTS.phone.title),
      api.findProductByTitle(PRODUCTS.laptop.title),
    ]);
    // Seeded through the API: this test is about deletion, so the add path is
    // setup, and setup should be fast and incapable of failing for UI reasons.
    await api.addToCart(authToken, phone.id);
    await api.addToCart(authToken, laptop.id);

    await cartPage.goto();
    await cartPage.expectLoaded();
    await expect(cartPage.rows).toHaveCount(2);

    await cartPage.deleteLine(phone.title);

    await cartPage.expectContains(laptop.title);
    await expect(cartPage.rows).toHaveCount(1);
    await cartPage.expectTotal(laptop.price);
  });

  test('empties to a zero total when the last line is removed @regression', async ({
    api,
    authToken,
    cartPage,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.monitor.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    await cartPage.expectLoaded();
    await cartPage.deleteLine(product.title);

    await cartPage.expectEmpty();
    await cartPage.expectTotal(0);
  });

  test('persists the cart across a page reload @regression', async ({
    api,
    authToken,
    cartPage,
    page,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    await cartPage.expectContains(product.title);

    await page.reload();

    await cartPage.expectLoaded();
    await cartPage.expectContains(product.title);
  });

  test('shows an empty cart for a brand-new account @regression', async ({ cartPage }) => {
    await cartPage.goto();
    await cartPage.expectLoaded();

    await cartPage.expectEmpty();
    await cartPage.expectTotal(0);
  });
});

test.describe('Cart — anonymous', () => {
  test('does not carry an anonymous cart into the session after login @regression', async ({
    api,
    productPage,
    cartPage,
    navBar,
    loginModal,
    dialogs,
    registeredUser,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);

    await productPage.gotoProduct(product.id);
    await productPage.expectLoaded();
    await productPage.addToCart();
    // Note the missing full stop. Logged out, the AUT takes a different code path
    // and reports "Product added" — an inconsistency worth pinning, because a
    // test that matched loosely would hide it.
    await expect.poll(() => dialogs.last).toBe('Product added');

    await navBar.openLogin();
    await loginModal.login(registeredUser);
    await navBar.expectLoggedInAs(registeredUser.username);

    await cartPage.goto();
    await cartPage.expectLoaded();
    await cartPage.expectEmpty();
  });
});
