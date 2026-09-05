import { expect, test } from '../../../src/fixtures';
import { createOrder, createTestUser, PRODUCTS } from '../../../src/data';

/**
 * The core business flow, end to end, in one test.
 *
 * Every step here is covered in isolation elsewhere, so why keep this?
 * Because isolated tests can all pass while the *journey* is broken: each one
 * seeds its own starting state through the API, so none of them proves that the
 * state a real customer accumulates — register, then log in, then browse, then
 * add, then pay — carries correctly from one step to the next. This is the only
 * test that starts from nothing and buys something the way a person would, and
 * it is the one to look at first when someone asks "is the site working".
 *
 * Deliberately kept to a single, thin happy path. Variations belong in the
 * focused specs; a journey test that grows branches becomes slow, fragile, and
 * tells you less on failure, not more.
 */
test.describe('Core purchase journey', () => {
  test('register, log in, add to cart and buy @smoke @regression @journey', async ({
    api,
    homePage,
    productPage,
    cartPage,
    navBar,
    loginModal,
    signupModal,
    purchaseConfirmation,
    dialogs,
  }, testInfo) => {
    const user = createTestUser('journey');
    await testInfo.attach('test-user', { body: user.username, contentType: 'text/plain' });
    const product = await api.findProductByTitle(PRODUCTS.phone.title);

    await test.step('a new visitor registers', async () => {
      await homePage.goto();
      await homePage.expectLoaded();
      await navBar.openSignup();
      await signupModal.signup(user);
      await expect.poll(() => dialogs.last).toBe('Sign up successful.');
      dialogs.clear();
    });

    await test.step('and logs in with those credentials', async () => {
      await navBar.openLogin();
      await loginModal.login(user);
      await navBar.expectLoggedInAs(user.username);
    });

    await test.step('browses a category and opens a product', async () => {
      await homePage.selectCategory(PRODUCTS.phone.category);
      await homePage.openProduct(product.title);
      await productPage.expectLoaded();
      expect(await productPage.readTitle()).toBe(product.title);
      expect(await productPage.readPrice()).toBe(product.price);
    });

    await test.step('adds it to the cart', async () => {
      await productPage.addToCart();
      await expect.poll(() => dialogs.last).toBe('Product added.');
    });

    await test.step('reviews the cart', async () => {
      await navBar.openCart();
      await cartPage.expectLoaded();
      await cartPage.expectContains(product.title);
      await cartPage.expectTotal(product.price);
    });

    await test.step('places the order', async () => {
      const order = createOrder();
      const orderModal = await cartPage.openOrderModal();
      await orderModal.expectTotal(product.price);
      await orderModal.placeOrder(order);

      const receipt = await purchaseConfirmation.readReceipt();
      expect(receipt.amount, 'the customer is charged what the cart showed').toBe(product.price);
      expect(receipt.name).toBe(order.name);
      await purchaseConfirmation.confirm();
    });

    await test.step('and is left with an empty cart', async () => {
      await cartPage.goto();
      await cartPage.expectLoaded();
      await cartPage.expectEmpty();
      // Checked at the source as well: the UI could render an empty table over a
      // cart the server still holds, and the next login would resurrect it.
      const token = await api.loginOrThrow(user);
      expect(await api.viewCart(token)).toHaveLength(0);
    });
  });
});
