import { expect, test } from '../../../src/fixtures';
import { PRODUCTS } from '../../../src/data';
import { CartPage, HomePage } from '../../../src/pages';
import { LoginModal, NavBar } from '../../../src/components';
import type { Product } from '../../../src/api';

/**
 * Kept outside the test body so the empty-catalogue guard is not a conditional
 * inside a test — a branch in a spec means two possible behaviours and only one
 * of them gets exercised on any given run.
 */
function priceExtremes(products: Product[]): { cheapest: Product; dearest: Product } {
  const sorted = [...products].sort((a, b) => a.price - b.price);
  const [cheapest] = sorted;
  const dearest = sorted.at(-1);
  if (!cheapest || !dearest) throw new Error('Catalogue is empty — cannot pick price extremes.');
  return { cheapest, dearest };
}

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

  test('totals a large cart correctly @regression', async ({ api, authToken, cartPage }) => {
    // Boundary on quantity rather than on a field. Totals are the kind of thing
    // that works for two items and drifts for twenty — string concatenation
    // instead of addition, a partial re-render, a paginated fetch. Ten lines is
    // enough to expose that class of bug and still finish quickly.
    const products = await api.listAllProducts();
    const chosen = products.slice(0, 10);
    for (const product of chosen) {
      await api.addToCart(authToken, product.id);
    }

    await cartPage.goto();
    await cartPage.expectLoaded();
    await expect(cartPage.rows).toHaveCount(chosen.length);

    const expectedTotal = chosen.reduce((sum, product) => sum + product.price, 0);
    await cartPage.expectTotal(expectedTotal);
    expect(await cartPage.sumOfLines()).toBe(expectedTotal);
  });

  test('totals the cheapest and most expensive products correctly @regression', async ({
    api,
    authToken,
    cartPage,
  }) => {
    // Price extremes, chosen at runtime rather than hardcoded: the catalogue can
    // change without this test going stale, and it exercises the widest possible
    // spread the real data allows.
    const { cheapest, dearest } = priceExtremes(await api.listAllProducts());

    await api.addToCart(authToken, cheapest.id);
    await api.addToCart(authToken, dearest.id);

    await cartPage.goto();
    await cartPage.expectLoaded();
    await cartPage.expectTotal(cheapest.price + dearest.price);
  });

  test('shows an empty cart for a brand-new account @regression', async ({ cartPage }) => {
    await cartPage.goto();
    await cartPage.expectLoaded();

    await cartPage.expectEmpty();
    await cartPage.expectTotal(0);
  });
});

test.describe('Cart — persistence across sessions', () => {
  test('cart survives into a completely fresh browser session @regression', async ({
    api,
    authToken,
    browser,
    registeredUser,
  }) => {
    // Distinct from the reload test: a reload keeps the browser context, its
    // cookies and its memory. This opens a brand-new context — the equivalent of
    // the customer coming back tomorrow on the same machine — and logs in again
    // from scratch. It is what proves the cart is genuinely server-side state
    // rather than something the page happened to still be holding.
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    const freshContext = await browser.newContext();
    try {
      const freshPage = await freshContext.newPage();
      const home = new HomePage(freshPage);
      const nav = new NavBar(freshPage);
      const login = new LoginModal(freshPage);
      const cart = new CartPage(freshPage);

      await home.goto();
      await home.expectLoaded();
      await nav.openLogin();
      await login.login(registeredUser);
      await nav.expectLoggedInAs(registeredUser.username);

      await cart.goto();
      await cart.expectLoaded();
      await cart.expectContains(product.title);
      await cart.expectTotal(product.price);
    } finally {
      await freshContext.close();
    }
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
