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
});
