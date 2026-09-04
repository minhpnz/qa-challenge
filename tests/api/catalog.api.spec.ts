import { expect, test } from '../../src/fixtures';
import { CATEGORIES, PRODUCTS } from '../../src/data';

test.describe('API — catalogue', () => {
  test('returns a non-empty product list @smoke @regression', async ({ api }) => {
    const products = await api.listProducts();

    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product, `Product ${product.id} is missing required fields`).toMatchObject({
        id: expect.any(Number),
        title: expect.any(String),
        price: expect.any(Number),
        cat: expect.any(String),
      });
      expect(product.price, `Product "${product.title}" has a non-positive price`).toBeGreaterThan(
        0,
      );
    }
  });

  test('product ids are unique @regression', async ({ api }) => {
    const products = await api.listProducts();
    const ids = products.map((product) => product.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const category of CATEGORIES) {
    test(`filters by category "${category}" without leaking other categories @regression`, async ({
      api,
    }) => {
      const products = await api.listProductsByCategory(category);

      expect(products.length).toBeGreaterThan(0);
      expect(products.every((product) => product.cat === category)).toBe(true);
    });
  }

  test('single-product view agrees with the list view @regression', async ({ api }) => {
    const fromList = await api.findProductByTitle(PRODUCTS.phone.title);

    const fromView = await api.getProduct(fromList.id);

    // Cross-endpoint consistency: two sources of truth for a price is how a
    // catalogue page and a cart end up disagreeing in production.
    expect(fromView).toMatchObject({
      id: fromList.id,
      title: fromList.title,
      price: fromList.price,
    });
  });
});
