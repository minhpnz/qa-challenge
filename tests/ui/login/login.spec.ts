import { expect, test } from '../../../src/fixtures';

/**
 * Login — functional paths.
 *
 * Every test here starts from a freshly registered account (the `registeredUser`
 * fixture), so none of them depend on a shared credential that another test, or
 * another engineer's manual poking, can invalidate.
 */
test.describe('Login', () => {
  test('logs in with valid credentials @smoke @regression', async ({
    homePage,
    navBar,
    loginModal,
    registeredUser,
  }) => {
    await homePage.goto();
    await homePage.expectLoaded();
    await navBar.expectLoggedOut();

    await navBar.openLogin();
    await loginModal.login(registeredUser);

    await navBar.expectLoggedInAs(registeredUser.username);
    await loginModal.expectClosed();
  });

  test('keeps the session across navigation @regression', async ({
    loggedInUser,
    cartPage,
    navBar,
  }) => {
    await cartPage.goto();
    await cartPage.expectLoaded();
    await navBar.expectLoggedInAs(loggedInUser.username);
  });

  test('logs out and returns to the anonymous state @regression', async ({
    loggedInUser,
    navBar,
  }) => {
    await navBar.expectLoggedInAs(loggedInUser.username);

    await navBar.logout();

    await navBar.expectLoggedOut();
  });

  test('re-opening the modal after logout starts empty @regression', async ({
    navBar,
    loginModal,
    loggedInUser,
  }) => {
    await navBar.logout();
    await navBar.expectLoggedOut();

    await navBar.openLogin();
    await loginModal.expectOpen();

    // A stale username left in the field is a real (and commonly shipped) defect:
    // the next user of a shared machine sees the previous account's name.
    await expect(loginModal.username).toHaveValue('');
    await expect(loginModal.password).toHaveValue('');
    expect(loggedInUser.username).not.toBe('');
  });
});
