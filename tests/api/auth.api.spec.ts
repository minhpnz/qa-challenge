import { expect, test } from '../../src/fixtures';
import { createTestUser, unknownUser } from '../../src/data';
import { encodeCredentials } from '../../src/api';

/**
 * API layer — authentication.
 *
 * These run without launching a browser, so the whole file finishes in seconds
 * and is safe to gate every pull request on. They also cover the contract
 * details a UI test physically cannot see: status codes, response shape, and the
 * fact that this API reports failure at HTTP 200.
 */
test.describe('API — auth', () => {
  test('registers a new user @smoke @regression', async ({ api }) => {
    const user = createTestUser('api');

    const result = await api.signup(user);

    expect(result.ok).toBe(true);
  });

  test('rejects a duplicate registration @regression', async ({ api, registeredUser }) => {
    const result = await api.signup(registeredUser);

    expect(result).toEqual({ ok: false, errorMessage: 'This user already exist.' });
  });

  test('issues a token for valid credentials @smoke @regression', async ({
    api,
    registeredUser,
  }) => {
    const token = await api.loginOrThrow(registeredUser);

    expect(token.length).toBeGreaterThan(0);
    expect(token).not.toContain('Auth_token');
  });

  test('rejects a wrong password @regression', async ({ api, registeredUser }) => {
    const result = await api.login({ username: registeredUser.username, password: 'nope' });

    expect(result).toEqual({ ok: false, errorMessage: 'Wrong password.' });
  });

  test('rejects an unknown user @regression', async ({ api }) => {
    const result = await api.login(unknownUser());

    expect(result).toEqual({ ok: false, errorMessage: 'User does not exist.' });
  });

  test('reports authentication failures at HTTP 200 @regression', async ({ api }) => {
    const response = await api.post('/login', encodeCredentials(unknownUser()));

    // Not an approval — a pinned observation. Any client that trusts the status
    // code will treat a failed login as a success, and this is the check that
    // tells us the day the API starts behaving properly.
    expect(response.status()).toBe(200);
    expect(await response.json()).toHaveProperty('errorMessage');
  });

  test('rejects a login with an empty username @regression @bug', async ({ api }) => {
    // KNOWN DEFECT (DEMO-2), found by this suite: an empty username is not
    // validated, so the endpoint raises and returns an HTML 500 page instead of a
    // 4xx JSON error. Any client calling `response.json()` gets an unhelpful
    // SyntaxError rather than a handled rejection.
    //
    // Pinned with `test.fail()` rather than deleted or skipped: the check keeps
    // executing, documents the contract we expect, and turns green-to-red the
    // moment the API is fixed and this annotation goes stale.
    test.fail();
    const response = await api.post('/login', encodeCredentials({ username: '', password: 'x' }));

    expect(response.status(), 'an empty username should be a 4xx, not a 500').toBeLessThan(500);
  });
});
