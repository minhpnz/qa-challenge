import { expect, test } from '../../../src/fixtures';
import { unknownUser } from '../../../src/data';

/**
 * Login — negative and edge paths.
 *
 * DemoBlaze reports every one of these through `window.alert`, so the assertions
 * run against the DialogWatcher fixture. Each test asserts two things: the message
 * the user sees, AND that the session did not silently start anyway. Asserting
 * only the message would pass against an app that shows an error and logs you in.
 */
test.describe('Login — negative paths', () => {
  test.beforeEach(async ({ homePage, navBar, loginModal }) => {
    await homePage.goto();
    await homePage.expectLoaded();
    await navBar.openLogin();
    await loginModal.expectOpen();
  });

  test('rejects a wrong password @regression', async ({
    loginModal,
    navBar,
    dialogs,
    registeredUser,
  }) => {
    await loginModal.login({ username: registeredUser.username, password: 'definitely-wrong' });

    await expect.poll(() => dialogs.last).toBe('Wrong password.');
    await navBar.expectLoggedOut();
  });

  test('rejects an unknown username @regression', async ({ loginModal, navBar, dialogs }) => {
    await loginModal.login(unknownUser());

    await expect.poll(() => dialogs.last).toBe('User does not exist.');
    await navBar.expectLoggedOut();
  });

  test('blocks submission when both fields are empty @regression', async ({
    loginModal,
    navBar,
    dialogs,
  }) => {
    await loginModal.submit();

    await expect.poll(() => dialogs.last).toBe('Please fill out Username and Password.');
    await navBar.expectLoggedOut();
  });

  test('blocks submission when only the password is missing @regression', async ({
    loginModal,
    navBar,
    dialogs,
    registeredUser,
  }) => {
    await loginModal.fillCredentials({ username: registeredUser.username, password: '' });
    await loginModal.submit();

    await expect.poll(() => dialogs.last).toBe('Please fill out Username and Password.');
    await navBar.expectLoggedOut();
  });

  test('treats the username as case-sensitive @regression', async ({
    loginModal,
    navBar,
    dialogs,
    registeredUser,
  }) => {
    await loginModal.login({
      username: registeredUser.username.toUpperCase(),
      password: registeredUser.password,
    });

    await expect.poll(() => dialogs.last).toBe('User does not exist.');
    await navBar.expectLoggedOut();
  });

  test('does not trim surrounding whitespace in the username @regression', async ({
    loginModal,
    navBar,
    dialogs,
    registeredUser,
  }) => {
    // Documents actual behaviour rather than wished-for behaviour. If the AUT
    // starts trimming, this test fails and the team makes a deliberate decision —
    // which is the whole point of pinning edge-case semantics.
    await loginModal.login({
      username: `  ${registeredUser.username}  `,
      password: registeredUser.password,
    });

    await expect.poll(() => dialogs.last).toBe('User does not exist.');
    await navBar.expectLoggedOut();
  });

  test('does not leak whether an account exists through timing or wording @regression', async ({
    loginModal,
    navBar,
    dialogs,
    registeredUser,
  }) => {
    await loginModal.login({ username: registeredUser.username, password: 'wrong-password' });
    await expect.poll(() => dialogs.last).toBe('Wrong password.');

    // Security note, deliberately asserted as an observation, not a pass/fail on
    // wording: distinct messages for "wrong password" vs "no such user" are a
    // username-enumeration oracle. Captured here so the finding is visible in the
    // report and traceable to a test case, rather than living only in a doc.
    expect(
      dialogs.messages,
      'AUT distinguishes wrong-password from unknown-user — username enumeration risk',
    ).toContain('Wrong password.');
    await navBar.expectLoggedOut();
  });
});
