# Findings

Defects and behaviours discovered by building this suite. Each one is pinned by an
executable test rather than living only in this file — a finding with no test
attached is a finding that regresses silently.

`test.fail()` is used for confirmed defects: the check keeps running, stays
red-by-expectation, and flips to a loud failure the moment the bug is fixed and
the annotation goes stale. That is deliberately different from `test.skip()`,
which would stop telling us anything at all.

| ID     | Severity | Area     | Finding                                                                                                                                                            | Pinned by                                                                                     |
| ------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| DEMO-1 | Low      | Checkout | Receipt date is one month early. The app builds it with `Date.getMonth()`, which is zero-indexed.                                                                  | `place-order.spec.ts` → _receipt shows the correct calendar month_ `@bug`                     |
| DEMO-2 | Medium   | API      | `POST /login` with an empty username returns **HTTP 500** and an HTML body instead of a 4xx JSON error. Any client calling `.json()` gets an opaque `SyntaxError`. | `auth.api.spec.ts` → _rejects a login with an empty username_ `@bug`                          |
| DEMO-3 | Medium   | Checkout | An **empty cart can be checked out** for 0 USD and produces a real order id.                                                                                       | `place-order.spec.ts` → _accepts an order for an empty cart at zero value_                    |
| DEMO-4 | Low      | Checkout | Order validation is presence-only: a whitespace-only name and a non-numeric card number are both accepted.                                                         | `place-order.spec.ts` → _accepts a whitespace-only name_, _accepts a non-numeric credit card_ |
| DEMO-5 | Low      | Security | Login distinguishes _"Wrong password."_ from _"User does not exist."_ — a username-enumeration oracle.                                                             | `login.negative.spec.ts` → _does not leak whether an account exists_                          |
| DEMO-6 | Low      | Cart     | An anonymous cart is silently discarded on login rather than merged.                                                                                               | `add-to-cart.spec.ts` → _does not carry an anonymous cart into the session_                   |
| DEMO-7 | Low      | Frontend | The three category links share `id="itemc"` — duplicate DOM ids.                                                                                                   | Locator strategy in `HomePage.selectCategory`                                                 |
| DEMO-8 | Low      | Data     | Product title `"Sony vaio i7\n"` carries a trailing newline.                                                                                                       | Trimmed comparison in `findProductByTitle`                                                    |
| DEMO-9 | Low      | Frontend | "Product added." (logged in) vs "Product added" (logged out) — inconsistent confirmation text from two code paths.                                                 | `add-to-cart.spec.ts`, exact-match assertions                                                 |

## Test-side lessons captured while stabilising

These were **our** bugs, not the app's, and each one is the kind that would have
been "fixed" with a sleep by a less careful hand. They are written up because the
fix is the standard, and the standard is what the team inherits.

| Symptom                                                    | Real cause                                                                                                                                                                       | Fix                                                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Clicking OK on the purchase receipt did nothing            | SweetAlert only becomes interactive when it adds a `visible` class 500 ms after opening; its own click handler tests for that class and swallows earlier clicks                  | Wait for the widget's `visible` class — the exact signal its handler reads — not a `waitForTimeout(500)` |
| Cart occasionally showed 2 of 3 added products (Firefox)   | The loop polled for the alert text "Product added.", which the _previous_ iteration had already produced, so the wait returned instantly and the test navigated away mid-request | Reset the dialog watcher per iteration; assert on arrival count, not on a repeated message               |
| Login modal "still open" after a successful login (WebKit) | The app hides the modal and immediately calls `location.reload()`; the reload wins the race and the old document still carries Bootstrap's `.show`                               | Assert the logged-in state first — it cannot be true before the reload — then assert the modal           |
| Cart total intermittently wrong                            | The app _appends_ to `#totalp` per line, so a single read can catch a partial sum                                                                                                | Web-first `toHaveText`, which retries until the value settles                                            |
| "Empty cart" assertions could never fail                   | Zero rows is also what an un-fetched page looks like                                                                                                                             | Cart navigation waits for the `/viewcart` response before any assertion                                  |
