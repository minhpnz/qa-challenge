import { expect, test } from '../../src/fixtures';
import { newLineItemId } from '../../src/api';
import { PRODUCTS } from '../../src/data';

test.describe('API — cart', () => {
  test('adds an item and reads it back @smoke @regression', async ({ api, authToken }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);

    const lineItemId = await api.addToCart(authToken, product.id);

    const cart = await api.viewCart(authToken);
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ id: lineItemId, prod_id: product.id });
  });

  test('keeps each line addressable by its own id @regression', async ({ api, authToken }) => {
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    const first = await api.addToCart(authToken, product.id);
    const second = await api.addToCart(authToken, product.id);

    await api.deleteCartItem(first);

    const remaining = await api.viewCart(authToken);
    expect(remaining.map((entry) => entry.id)).toEqual([second]);
  });

  test('empties the cart @regression', async ({ api, authToken }) => {
    const product = await api.findProductByTitle(PRODUCTS.laptop.title);
    await api.addToCart(authToken, product.id);
    await api.addToCart(authToken, product.id);

    await api.clearCart(authToken);

    expect(await api.viewCart(authToken)).toHaveLength(0);
  });

  test('a new account starts with an empty cart @regression', async ({ api, authToken }) => {
    expect(await api.viewCart(authToken)).toHaveLength(0);
  });

  test('carts are isolated between accounts @regression', async ({ api, authToken }) => {
    // Multi-tenancy check: one user's cart must never leak into another's. This
    // is the class of defect that is invisible in a single-user UI test and
    // expensive in production.
    const product = await api.findProductByTitle(PRODUCTS.phone.title);
    await api.addToCart(authToken, product.id);

    const otherUser = { username: `iso_${newLineItemId()}`, password: 'Passw0rd!QA' };
    await api.signupOrThrow(otherUser);
    const otherToken = await api.loginOrThrow(otherUser);

    expect(await api.viewCart(otherToken)).toHaveLength(0);
    expect(await api.viewCart(authToken)).toHaveLength(1);
  });

  test('deleting a non-existent line item is a no-op, not an error @regression', async ({
    api,
    authToken,
  }) => {
    const response = await api.post('/deleteitem', { id: newLineItemId() });

    expect(response.status()).toBe(200);
    expect(await api.viewCart(authToken)).toHaveLength(0);
  });

  test.describe('negative paths', () => {
    test('rejects a malformed auth token when adding to the cart @regression', async ({ api }) => {
      const response = await api.post('/addtocart', {
        id: newLineItemId(),
        cookie: 'not-a-real-token',
        prod_id: 1,
        flag: true,
      });

      // The app's own client code branches on this exact string, so it is the
      // contract — not an implementation detail we happen to observe.
      expect(await response.json()).toEqual({ errorMessage: 'Bad parameter, token malformed.' });
    });

    test('rejects a malformed auth token when reading the cart @regression', async ({ api }) => {
      const response = await api.post('/viewcart', { cookie: 'not-a-real-token', flag: true });

      expect(await response.json()).toEqual({ errorMessage: 'Bad parameter, token malformed.' });
    });

    test("does not let anyone delete another account's cart line @regression @bug", async ({
      api,
      authToken,
    }) => {
      // KNOWN DEFECT (DEMO-16) — broken access control, OWASP A01.
      // `/deleteitem` takes only a line id: no token, no ownership check. Anyone
      // who can guess or observe an id can empty a stranger's basket. Pinned with
      // test.fail() so the check keeps running and turns red the day it is fixed.
      test.fail();
      const product = await api.findProductByTitle(PRODUCTS.phone.title);
      const victimLine = await api.addToCart(authToken, product.id);

      // Deliberately unauthenticated: no token is supplied at all.
      await api.post('/deleteitem', { id: victimLine });

      expect(
        await api.viewCart(authToken),
        'another party deleted this cart line without authorisation',
      ).toHaveLength(1);
    });

    test('rejects a product id that does not exist @regression @bug', async ({
      api,
      authToken,
    }) => {
      // KNOWN DEFECT (DEMO-17) — the id is not validated against the catalogue, so
      // the cart accepts a phantom line that `/view` then reports as "Not found.",
      // leaving a row the UI cannot render and checkout still counts.
      test.fail();
      await api.addToCart(authToken, 99999);

      expect(await api.viewCart(authToken), 'a non-existent product was added').toHaveLength(0);
    });

    test('rejects a negative product id @regression @bug', async ({ api, authToken }) => {
      // KNOWN DEFECT (DEMO-17), same root cause with an obviously invalid value.
      test.fail();
      await api.addToCart(authToken, -1);

      expect(await api.viewCart(authToken), 'a negative product id was accepted').toHaveLength(0);
    });

    test('does not silently overwrite a line when an id is reused @regression @bug', async ({
      api,
      authToken,
    }) => {
      // KNOWN DEFECT (DEMO-18) — line ids are generated by the *client* and the
      // server enforces no uniqueness, so re-using one replaces the existing line
      // instead of adding a second. Two tabs, or two clients using a weak id
      // scheme, silently destroy each other's basket entries.
      test.fail();
      const [phone, laptop] = await Promise.all([
        api.findProductByTitle(PRODUCTS.phone.title),
        api.findProductByTitle(PRODUCTS.laptop.title),
      ]);
      const collidingId = newLineItemId();
      await api.addToCart(authToken, phone.id, collidingId);
      await api.addToCart(authToken, laptop.id, collidingId);

      expect(await api.viewCart(authToken), 'the second add replaced the first').toHaveLength(2);
    });
  });
});
