import type { APIRequestContext, APIResponse } from '@playwright/test';
import type {
  CartContents,
  CartEntry,
  Category,
  Credentials,
  LoginResult,
  Product,
  ProductList,
  SignupResult,
} from './types';

/**
 * Typed client for the DemoBlaze JSON API.
 *
 * It serves two jobs and the distinction matters:
 *   1. it is the system under test for `tests/api`;
 *   2. it is the *fast path* for UI test setup — registering a user or seeding a
 *      cart through the API instead of clicking through the UI. Setup performed
 *      through the UI is the single largest source of flake and runtime in most
 *      suites: a cart test should fail because the cart is broken, not because
 *      the signup modal animated slowly.
 *
 * Quirks are encoded here once so no test has to know them:
 *   - passwords travel base64-encoded (obfuscation, not security);
 *   - errors come back HTTP 200 with an `errorMessage` body, so status codes
 *     cannot be used as the success signal;
 *   - success bodies are sometimes a bare JSON string (`""`, `"Auth_token: …"`).
 */
export class DemoblazeApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseUrl: string,
  ) {}

  // --- raw access -----------------------------------------------------------
  // Exposed so API tests can assert on status/headers/latency, which the typed
  // helpers deliberately hide from UI tests.

  async post(endpoint: string, data: unknown): Promise<APIResponse> {
    return this.request.post(this.url(endpoint), { data });
  }

  async get(endpoint: string): Promise<APIResponse> {
    return this.request.get(this.url(endpoint));
  }

  // --- auth -----------------------------------------------------------------

  async signup(credentials: Credentials): Promise<SignupResult> {
    const response = await this.post('/signup', encodeCredentials(credentials));
    const body = await parseBody(response, '/signup');
    const error = errorMessageOf(body);
    return error ? { ok: false, errorMessage: error } : { ok: true };
  }

  async signupOrThrow(credentials: Credentials): Promise<void> {
    const result = await this.signup(credentials);
    if (!result.ok) {
      throw new Error(`Signup failed for "${credentials.username}": ${result.errorMessage}`);
    }
  }

  async login(credentials: Credentials): Promise<LoginResult> {
    const response = await this.post('/login', encodeCredentials(credentials));
    const body = await parseBody(response, '/login');
    const error = errorMessageOf(body);
    if (error) return { ok: false, errorMessage: error };
    if (typeof body !== 'string' || !body.startsWith('Auth_token:')) {
      throw new Error(`Unrecognised /login response: ${JSON.stringify(body)}`);
    }
    return { ok: true, token: body.replace('Auth_token:', '').trim() };
  }

  async loginOrThrow(credentials: Credentials): Promise<string> {
    const result = await this.login(credentials);
    if (!result.ok) {
      throw new Error(`Login failed for "${credentials.username}": ${result.errorMessage}`);
    }
    return result.token;
  }

  // --- catalogue ------------------------------------------------------------

  async listProducts(): Promise<Product[]> {
    const response = await this.get('/entries');
    return ((await response.json()) as ProductList).Items;
  }

  async listProductsByCategory(category: Category): Promise<Product[]> {
    const response = await this.post('/bycat', { cat: category });
    return ((await response.json()) as ProductList).Items;
  }

  async getProduct(id: number): Promise<Product> {
    const response = await this.post('/view', { id });
    return (await response.json()) as Product;
  }

  /**
   * The full catalogue.
   *
   * `GET /entries` returns only the first page — 9 of the 15 products — which is
   * an easy and expensive assumption to get wrong: a lookup for a monitor against
   * `/entries` fails with "not in the catalogue" and sends a triager hunting for a
   * data bug that does not exist. The union of the category endpoints is the only
   * complete view, so it is computed here once rather than rediscovered per test.
   */
  async listAllProducts(): Promise<Product[]> {
    const categories: Category[] = ['phone', 'notebook', 'monitor'];
    const pages = await Promise.all(categories.map((cat) => this.listProductsByCategory(cat)));
    const byId = new Map<number, Product>();
    for (const product of pages.flat()) byId.set(product.id, product);
    return [...byId.values()];
  }

  async findProductByTitle(title: string): Promise<Product> {
    const products = await this.listAllProducts();
    // Titles in this catalogue carry stray whitespace ("Sony vaio i7\n"), so the
    // comparison is trimmed on both sides — a data-quality defect in the AUT that
    // tests should tolerate rather than trip over.
    const match = products.find((product) => product.title.trim() === title.trim());
    if (!match) throw new Error(`No product titled "${title}" in the catalogue.`);
    return match;
  }

  // --- cart -----------------------------------------------------------------

  /** Returns the line-item id, which is the handle needed to delete the line later. */
  async addToCart(token: string, productId: number, itemId = newLineItemId()): Promise<string> {
    await this.post('/addtocart', { id: itemId, cookie: token, prod_id: productId, flag: true });
    return itemId;
  }

  async viewCart(token: string): Promise<CartEntry[]> {
    const response = await this.post('/viewcart', { cookie: token, flag: true });
    return ((await response.json()) as CartContents).Items;
  }

  async deleteCartItem(lineItemId: string): Promise<void> {
    await this.post('/deleteitem', { id: lineItemId });
  }

  async clearCart(token: string): Promise<void> {
    const entries = await this.viewCart(token);
    await Promise.all(entries.map((entry) => this.deleteCartItem(entry.id)));
  }

  private url(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }
}

/** The API expects base64 passwords; every caller would otherwise re-derive this. */
export function encodeCredentials(credentials: Credentials): Credentials {
  return {
    username: credentials.username,
    password: Buffer.from(credentials.password, 'utf8').toString('base64'),
  };
}

export function newLineItemId(): string {
  return `pw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The API is not uniformly JSON: some inputs (an empty username, for one) make it
 * return an HTML 500 page. Calling `response.json()` on that throws a bare
 * `SyntaxError: Unexpected token '<'`, which tells a triager nothing about which
 * request failed or how. Failing here with the endpoint, status and body prefix
 * turns a five-minute investigation into a five-second one.
 */
async function parseBody(response: APIResponse, endpoint: string): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `${endpoint} returned a non-JSON body (HTTP ${response.status()}): ${text.slice(0, 200)}`,
    );
  }
}

/** DemoBlaze signals failure in the body, at HTTP 200. Normalise that in one place. */
function errorMessageOf(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'errorMessage' in body) {
    return String(body.errorMessage);
  }
  return undefined;
}
