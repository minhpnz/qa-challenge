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

  test('treats the password as case-sensitive @regression', async ({ api, registeredUser }) => {
    const result = await api.login({
      username: registeredUser.username,
      password: registeredUser.password.toUpperCase(),
    });

    expect(result).toEqual({ ok: false, errorMessage: 'Wrong password.' });
  });

  test("rejects a valid username paired with another account's password @regression", async ({
    api,
    registeredUser,
  }) => {
    const other = createTestUser('other');
    await api.signupOrThrow({ ...other, password: 'A-Different-Passw0rd!' });

    const result = await api.login({
      username: registeredUser.username,
      password: 'A-Different-Passw0rd!',
    });

    expect(result).toEqual({ ok: false, errorMessage: 'Wrong password.' });
  });

  test('does not trim a whitespace-padded username @regression', async ({
    api,
    registeredUser,
  }) => {
    const result = await api.login({
      username: `  ${registeredUser.username}  `,
      password: registeredUser.password,
    });

    expect(result.ok).toBe(false);
  });

  test('accepts single-character credentials — no password policy @regression @bug', async ({
    api,
  }) => {
    // KNOWN DEFECT (DEMO-12). There is no minimum length, complexity or breach
    // check, so a one-character password is a valid account credential.
    test.fail();
    const tiny = { username: `p${Date.now().toString(36)}`, password: 'b' };
    await api.signupOrThrow(tiny);

    const result = await api.login(tiny);

    expect(result.ok, 'a one-character password was accepted').toBe(false);
  });

  test('round-trips a unicode username @regression', async ({ api }) => {
    const user = { ...createTestUser('uni'), username: `nguyễn_山田_${Date.now().toString(36)}` };
    await api.signupOrThrow(user);

    const token = await api.loginOrThrow(user);

    expect(token.length).toBeGreaterThan(0);
  });

  test('accepts a password of special characters @regression', async ({ api }) => {
    // Passwords travel base64-encoded; this is the case that would expose an
    // encoding bug in that hop rather than in the credential itself.
    const user = { ...createTestUser('spec'), password: '!@#$%^&*()_+{}|:"<>?' };
    await api.signupOrThrow(user);

    const token = await api.loginOrThrow(user);

    expect(token.length).toBeGreaterThan(0);
  });

  test('applies no rate limit or lockout to repeated failures @regression @bug', async ({
    api,
    registeredUser,
  }) => {
    // KNOWN DEFECT (DEMO-11). Twenty consecutive wrong passwords are all
    // processed and the correct one still works immediately afterwards — no
    // delay, no CAPTCHA, no lockout. Open to credential stuffing.
    test.fail();
    const attempts = 20;
    const results = [];
    for (let i = 0; i < attempts; i += 1) {
      results.push(await api.login({ username: registeredUser.username, password: `wrong-${i}` }));
    }

    const stillWorks = await api.login(registeredUser);

    expect(
      results.every((r) => !r.ok) && stillWorks.ok,
      'the account was never throttled or locked after 20 failures',
    ).toBe(false);
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
