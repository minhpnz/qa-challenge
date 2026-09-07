import { expect, test } from '../../../src/fixtures';

/**
 * The login modal as a component: how it opens, how it closes, and what it does
 * with hostile input.
 *
 * These were documented as manual cases on the assumption that keyboard and
 * overlay behaviour needs a human. It does not — Playwright drives the keyboard
 * and the mouse directly, and a dismissal path left unautomated is one a
 * refactor can silently break.
 */
/**
 * DemoBlaze is a public sandbox, so the account namespace is shared with every
 * other person testing it. Well-known payload strings — `' OR '1'='1`,
 * `<script>alert(1)</script>`, a run of 256 A's, `admin`, `test` — are all
 * *already registered* by someone. Asserting "User does not exist." for them is
 * asserting on global state this suite does not own, and it fails the day a
 * stranger signs up.
 *
 * So these tests assert the security property instead of the incidental message:
 * the attempt was rejected, no session started, and nothing executed. That holds
 * whichever rejection the server happens to return.
 */
const REJECTED = /^(User does not exist\.|Wrong password\.)$/;

test.describe('Login modal', () => {
  test.beforeEach(async ({ homePage, navBar, loginModal }) => {
    await homePage.goto();
    await homePage.expectLoaded();
    await navBar.openLogin();
    await loginModal.expectOpen();
  });

  test('closes via the footer Close button @regression', async ({ loginModal, navBar }) => {
    await loginModal.closeButton.click();

    await loginModal.expectClosed();
    await navBar.expectLoggedOut();
  });

  test('closes via the header x @regression', async ({ loginModal, navBar }) => {
    await loginModal.dismissButton.click();

    await loginModal.expectClosed();
    await navBar.expectLoggedOut();
  });

  test('closes when Escape is pressed @regression', async ({ loginModal, navBar }) => {
    await loginModal.pressEscape();

    await loginModal.expectClosed();
    await navBar.expectLoggedOut();
  });

  test('closes when the backdrop is clicked @regression', async ({ loginModal, navBar }) => {
    await loginModal.clickOutside();

    await loginModal.expectClosed();
    await navBar.expectLoggedOut();
  });

  test('masks the password as it is typed @regression', async ({ loginModal }) => {
    await loginModal.password.fill('Passw0rd!QA');

    // The value is present but never rendered in the clear — this is the check
    // that catches someone "fixing" a test by switching the field to type=text.
    await expect(loginModal.password).toHaveAttribute('type', 'password');
    await expect(loginModal.password).toHaveValue('Passw0rd!QA');
  });

  test('treats a SQL injection payload as literal text @regression', async ({
    loginModal,
    navBar,
    dialogs,
  }) => {
    await loginModal.login({ username: "' OR '1'='1", password: "' OR '1'='1" });

    // No authentication bypass, no server error, no SQL error text leaked.
    await expect.poll(() => dialogs.last).toMatch(REJECTED);
    await navBar.expectLoggedOut();
  });

  test('does not execute a script payload in the username @regression', async ({
    loginModal,
    navBar,
    dialogs,
  }) => {
    await loginModal.login({ username: '<script>alert(1)</script>', password: 'anything' });

    await expect.poll(() => dialogs.last).toMatch(REJECTED);
    // The real assertion: if the payload had executed, its own alert('1') would
    // have been captured here alongside the app's rejection message.
    expect(dialogs.messages, 'a script payload executed').not.toContain('1');
    await navBar.expectLoggedOut();
  });

  test('handles a very long username without breaking @regression', async ({
    loginModal,
    navBar,
    dialogs,
  }) => {
    await loginModal.login({ username: 'A'.repeat(256), password: 'Passw0rd!QA' });

    // A normal rejection, not a 500 or an unhandled client error.
    await expect.poll(() => dialogs.last).toMatch(REJECTED);
    await navBar.expectLoggedOut();
  });
});
