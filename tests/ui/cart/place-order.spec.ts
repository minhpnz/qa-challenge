import { expect, test } from '../../../src/fixtures';
import { createOrder, ORDER_EDGE_CASES, PRODUCTS } from '../../../src/data';

/**
 * Checkout — the money path.
 *
 * The cart is seeded through the API so that a checkout failure means checkout is
 * broken, not that a product page was slow. The assertions deliberately go past
 * "a success dialog appeared": the receipt is parsed and each field is checked
 * against what was ordered, because a confirmation that shows the wrong amount is
 * a worse defect than a confirmation that never appears.
 */
test.describe('Place order', () => {
  // Every test in this file starts from a fresh, logged-in account. Stating that
  // precondition once, here, keeps the start state visible without repeating a
  // fixture in every signature — and fails with a clear message if the session
  // ever stops being established.
  test.beforeEach(async ({ navBar, loggedInUser }) => {
    await navBar.expectLoggedInAs(loggedInUser.username);
  });

  test('completes an order and reports the correct receipt @smoke @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const [phone, laptop] = await Promise.all([
      api.findProductByTitle(PRODUCTS.phone.title),
      api.findProductByTitle(PRODUCTS.laptop.title),
    ]);
    await api.addToCart(authToken, phone.id);
    await api.addToCart(authToken, laptop.id);
    const expectedTotal = phone.price + laptop.price;

    await cartPage.goto();
    await cartPage.expectLoaded();
    await cartPage.expectTotal(expectedTotal);

    const orderModal = await cartPage.openOrderModal();
    await orderModal.expectTotal(expectedTotal);

    const order = createOrder();
    await orderModal.placeOrder(order);

    const receipt = await purchaseConfirmation.readReceipt();
    expect(receipt.amount).toBe(expectedTotal);
    expect(receipt.cardNumber).toBe(order.creditCard);
    expect(receipt.name).toBe(order.name);
    expect(receipt.id).toMatch(/^\d+$/);

    await purchaseConfirmation.confirm();

    // The server-side cart must be emptied by the purchase. Checked through the
    // API rather than the UI: this asserts the system's state, not the render.
    expect(await api.viewCart(authToken)).toHaveLength(0);
  });

  test('empties the cart in the UI after a completed order @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.monitor.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder());
    await purchaseConfirmation.confirm();

    await cartPage.goto();
    await cartPage.expectLoaded();
    await cartPage.expectEmpty();
    await cartPage.expectTotal(0);
  });

  test('rejects an order with no name @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
    dialogs,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ name: '' }));

    await expect.poll(() => dialogs.last).toBe('Please fill out Name and Creditcard.');
    await expect(purchaseConfirmation.root).toBeHidden();
    // The order must not have been silently taken: the cart is still intact.
    expect(await api.viewCart(authToken)).toHaveLength(1);
  });

  test('rejects an order with no credit card @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
    dialogs,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ creditCard: '' }));

    await expect.poll(() => dialogs.last).toBe('Please fill out Name and Creditcard.');
    await expect(purchaseConfirmation.root).toBeHidden();
    expect(await api.viewCart(authToken)).toHaveLength(1);
  });

  test('accepts an order for an empty cart at zero value @regression', async ({
    cartPage,
    purchaseConfirmation,
  }) => {
    await cartPage.goto();
    await cartPage.expectLoaded();
    await cartPage.expectEmpty();

    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder());

    // Pinning a genuine product weakness: an empty cart checks out for 0 USD and
    // produces a real order id. The test documents it so it cannot regress
    // further and so the finding is traceable to an executable check.
    const receipt = await purchaseConfirmation.readReceipt();
    expect(receipt.amount).toBe(0);
  });

  test('accepts a whitespace-only name — validation is presence-only @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ name: ORDER_EDGE_CASES.whitespaceOnly }));

    await purchaseConfirmation.expectVisible();
  });

  test('accepts a non-numeric credit card — no format validation @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ creditCard: ORDER_EDGE_CASES.nonNumericCard }));

    const receipt = await purchaseConfirmation.readReceipt();
    expect(receipt.cardNumber).toBe(ORDER_EDGE_CASES.nonNumericCard);
  });

  test('preserves unicode characters in the customer name @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ name: ORDER_EDGE_CASES.unicodeName }));

    const receipt = await purchaseConfirmation.readReceipt();
    expect(receipt.name).toBe(ORDER_EDGE_CASES.unicodeName);
  });

  test('closing the order modal does not place an order @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.fill(createOrder());
    await orderModal.closeButton.click();

    await orderModal.expectClosed();
    await expect(purchaseConfirmation.root).toBeHidden();
    // The decisive check: the goods are still in the basket, server-side.
    expect(await api.viewCart(authToken)).toHaveLength(1);
  });

  test('rejects an order with both required fields empty @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
    dialogs,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder({ name: '', creditCard: '' });

    await expect.poll(() => dialogs.last).toBe('Please fill out Name and Creditcard.');
    await expect(purchaseConfirmation.root).toBeHidden();
    expect(await api.viewCart(authToken)).toHaveLength(1);
  });

  test('handles a very long customer name @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ name: ORDER_EDGE_CASES.longName }));

    // Boundary check on rendering as much as on storage: the receipt must still
    // be a readable dialog, not a blown-out layout.
    const receipt = await purchaseConfirmation.readReceipt();
    expect(receipt.name).toHaveLength(ORDER_EDGE_CASES.longName.length);
  });

  test('does not execute a script payload in the customer name @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
    dialogs,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ name: '<img src=x onerror=alert(1)>' }));

    const receipt = await purchaseConfirmation.readReceipt();
    // Rendered as text, not as an element — and the payload's own alert never fired.
    expect(receipt.name).toContain('<img');
    expect(dialogs.messages, 'a script payload executed').not.toContain('1');
  });

  test('accepts a card number containing spaces and dashes @regression', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder({ creditCard: '4111-1111 1111-1111' }));

    // Pinned behaviour: no normalisation is applied, the value is echoed as typed.
    const receipt = await purchaseConfirmation.readReceipt();
    expect(receipt.cardNumber).toBe('4111-1111 1111-1111');
  });

  test('does not confirm an order the server never received @regression @bug', async ({
    page,
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    // KNOWN DEFECT (DEMO-15). The receipt is rendered client-side without waiting
    // on the request, so blocking the call changes nothing the customer sees:
    // they are told the order succeeded when it did not.
    test.fail();
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    await page.route('https://api.demoblaze.com/deletecart', (route) => route.abort());

    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder());

    await expect(
      purchaseConfirmation.root,
      'a success receipt was shown for a request that failed',
    ).toBeHidden();
  });

  test('receipt shows the correct calendar month @bug', async ({
    api,
    authToken,
    cartPage,
    purchaseConfirmation,
  }) => {
    // KNOWN DEFECT (DEMO-1): the AUT builds the receipt date with
    // `Date.getMonth()`, which is zero-indexed, so every receipt is dated one
    // month early. `test.fail()` is the right instrument here rather than a skip:
    // the check keeps running, stays red-by-expectation, and turns into a loud
    // failure the moment the bug is fixed and the annotation is stale.
    test.fail();
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    await cartPage.goto();
    const orderModal = await cartPage.openOrderModal();
    await orderModal.placeOrder(createOrder());

    const receipt = await purchaseConfirmation.readReceipt();
    const now = new Date();
    expect(receipt.date).toBe(`${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`);
  });
});
