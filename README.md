# DemoBlaze E2E Automation Framework

A Playwright + TypeScript automation framework for [demoblaze.com](https://www.demoblaze.com/),
covering the **Login** and **Cart/Checkout** journeys across UI, API and performance layers —
plus the documented test case suite those journeys were derived from.

Built to be adopted by a team, not to pass a demo: every structural decision below
is written down with the alternative it was chosen over, because a framework
nobody can reason about is a framework nobody will extend.

## Deliverables

| #   | Deliverable                                                   | Where                                                                                                               |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | **Test case suite** — 94 cases across Login and Cart/Checkout | [`docs/DemoBlaze-Test-Cases.xlsx`](docs/DemoBlaze-Test-Cases.xlsx) · [CSVs for Google Sheets](docs/test-cases-csv/) |
| 2   | **Automation framework + demo scripts**                       | this repository — see _Framework structure_ below                                                                   |
| 3   | **Documentation** — structure, rationale, run steps           | this README, plus [`docs/api-contract.md`](docs/api-contract.md) and [`docs/findings.md`](docs/findings.md)         |

---

## Test case suite

94 documented cases — **44 Login**, **50 Cart/Checkout** — across four tabs
(Summary, Login, Cart, Defects). 18 columns per case, in three blocks:

- **Design** — id, module, feature area, title, type, priority, preconditions,
  numbered steps, test data, expected result.
- **Execution** — actual result, status (dropdown: Not Run / Pass / Fail /
  Blocked / N/A), executed by, executed on, environment. Shipped **empty and
  shaded**, ready for a manual cycle. A suite delivered with results nobody
  produced is a fiction, so automated cases report through CI instead.
- **Traceability** — automated yes/no, the **exact spec and test title** that runs
  it, and the defect id where one applies.

56 of the 94 have an executable check; the other 38 are deliberately manual
(browser chrome such as Escape and browser Back, network-fault injection, and
security probes that need a controlled environment).

Coverage against the three categories the brief names, per module:

| Module | Functional | Negative | Edge case | Security | UI  |
| ------ | ---------- | -------- | --------- | -------- | --- |
| Login  | 16         | 11       | 13        | 4        | —   |
| Cart   | 25         | 6        | 16        | 2        | 1   |

Every interactive control in both modules has at least one case — both modal
inputs and buttons, Escape, backdrop and X dismissal, the nav links and welcome
label, the session cookie, each cart line cell, the total, and all six order-form
fields.

Two conventions worth calling out:

- **Where the app is defective, the row states both the expected and the observed
  behaviour** and names the defect ID. A test case that quietly records a bug as
  correct behaviour is worse than no test case — it launders the defect into a
  requirement.
- **Prices, ids and totals are never asserted as constants.** They are read from
  the API at runtime, so a promotion or a catalogue reorder does not turn the
  suite red for a non-defect reason.

The workbook is generated from `scripts/test_case_data.py` — reviewable in a pull
request, diffable over time, and impossible to desync from the automation
references it cites. Regenerate with `python3 scripts/generate_test_cases.py`;
import instructions for Google Sheets are in
[`docs/test-cases-csv/README.md`](docs/test-cases-csv/README.md).

---

## Quick start

```bash
npm ci                              # install dependencies
npx playwright install              # download browser binaries (one-off)
cp .env.example .env                # optional — sensible defaults work as-is

npm run test:api                    # API layer only — no browser, ~10s
npm run test:ui                     # UI layer on Chromium
npm test                            # everything, every project
npm run report                      # open the HTML report
```

### Running the two required demo journeys

```bash
# Log in with valid credentials
npx playwright test --project=ui-chromium -g "logs in with valid credentials"

# Add to cart, then place an order
npx playwright test --project=ui-chromium -g "completes an order and reports the correct receipt"

# Both, plus the rest of the critical path
npm run test:smoke
```

### Other useful commands

| Command                      | What it does                                      |
| ---------------------------- | ------------------------------------------------- |
| `npm run test:cross-browser` | Chromium + Firefox + WebKit                       |
| `npm run test:mobile`        | Pixel 7 and iPhone 14 viewports                   |
| `npm run test:regression`    | Everything tagged `@regression`                   |
| `npm run test:perf`          | Performance budgets (serial)                      |
| `npm run test:headed`        | Watch it run in a real browser                    |
| `npm run test:debug`         | Playwright Inspector, one worker                  |
| `npm run codegen`            | Record a new interaction                          |
| `npm run verify`             | Format + lint + typecheck — the same gate CI runs |

No account setup is required. The framework registers its own throwaway account
per test through the API.

---

## Framework structure

```
config/                     Environment profiles + typed runtime config
  environments.ts             local | staging | production, as data
  index.ts                    validated env resolution, fails loudly at load

src/
  core/                     Framework primitives — thin on purpose
    base.page.ts              navigation + the "is this page loaded" contract
    base.component.ts         reusable, scoped UI fragments
    dialog.watcher.ts         native alert capture (the AUT's main error channel)
    matchers.ts               custom `toBeWithinBudget` matcher
    logger.ts
  api/                      Typed DemoBlaze API client + contract types
  components/               NavBar, Login/Signup modals, Order modal, receipt
  pages/                    HomePage, ProductPage, CartPage
  data/                     User / order factories, catalogue anchors
  fixtures/                 The framework's public API — what specs consume

tests/
  setup/                    Health gate — fails fast when the app is down
  ui/login/                 Login: functional, negative, edge
  ui/cart/                  Add-to-cart, and checkout
  api/                      Auth, cart, catalogue contract tests
  performance/              Page and API latency budgets

.github/workflows/e2e.yml   CI pipeline
docs/api-contract.md        The API's real, observed contract
docs/findings.md            Defects this suite found, each pinned by a test
```

### The layering rule

Dependencies point one way only:

```
tests  →  fixtures  →  pages / components / api  →  core / config
```

A spec never constructs a page object, never reads `process.env`, and never
contains a selector. If you find yourself wanting to, the abstraction is missing —
add it one layer down rather than reaching past it.

---

## Design rationale — why this, not that

### Fixtures as the public API, not `beforeEach`

A spec declares what it needs and receives it built, asserted, and scheduled for
cleanup:

```ts
test('adds a product to the cart', async ({ api, productPage, cartPage, dialogs, loggedInUser }) => {
```

**Why not `beforeEach`:** hooks are positional and invisible at the call site — a
reader has to scroll up to learn what state a test starts in, and a test that
needs slightly different setup either duplicates the hook or is moved into a new
`describe`. Fixtures are declarative, composable, lazily created (an API test
never launches a browser), and torn down in reverse order automatically. When
login gains a captcha, one fixture changes and every spec keeps passing.

### Page objects that expose intent, and assertions that live with the DOM knowledge

`cartPage.expectTotal(1150)` rather than `expect(await page.locator('#totalp').innerText()).toBe('1150')`.

**Why:** the assertion needs to know _how the AUT renders that total_ — it appends
per line, so a single read can catch a partial sum. That knowledge belongs next to
the locator, once, not copied into every spec. The ESLint config is told about the
`expect*` naming convention so `playwright/expect-expect` stays an error rather
than being switched off.

### Test data: a fresh account per test

DemoBlaze carts are server-side state keyed to the account, and accounts cannot be
deleted. Sharing one account across tests means sharing one cart — the classic
route to order-dependent, parallel-hostile suites.

So `registeredUser` creates a UUID-suffixed account through the API per test.
Unique across parallel workers, CI shards, and two branches building in the same
second.

**Trade-off, stated plainly:** this leaves orphan accounts on a public demo site.
Against a system we controlled, the right answer is a seeded pool plus API
teardown, or a per-run tenant. The property to preserve is _isolation_, and this
is the cheapest way to get it here.

### Setup through the API, verification through the UI

A cart test seeds its cart with `api.addToCart(...)` and then exercises checkout
through the browser.

**Why:** setup performed by clicking is the largest source of both runtime and
flake in most suites. A checkout test should fail because checkout is broken — not
because a product page was slow. The UI is still covered end to end: `add-to-cart.spec.ts`
drives the add path through the browser, once, deliberately.

### Native dialogs owned by a persistent watcher

DemoBlaze reports most outcomes through `window.alert`. Playwright auto-dismisses
dialogs when nothing is listening, so those messages vanish.

**Why not `page.waitForEvent('dialog')`:** it has to be armed around the exact
action, and while it is pending the triggering `click()` can block on the open
dialog — a well-known source of intermittent 30-second timeouts. One handler
registered for the page's lifetime removes the race: dialogs are always handled
immediately, and the test reads the recorded message afterwards.

### Test types as projects, scope as tags

`ui-chromium`, `ui-firefox`, `ui-webkit`, `ui-mobile-*`, `api`, `performance` are
**projects** — they differ in _what they run against_. `@smoke` / `@regression` are
**tags** — they differ in _how much you want to run_. The two are orthogonal, so
`--project=api --grep @smoke` composes without a combinatorial explosion of
directories.

Adding a browser or a device is a config entry, not a fork of the suite.

### A health gate before the UI projects

One cheap reachability check runs first, and every UI project depends on it. When
the site is down, the run stops in two seconds with a message naming the failing
dependency instead of producing 200 unrelated timeouts. Cheap insurance for the
thing that actually matters: whether people trust the signal.

---

## Reliability: how flake is prevented, not retried away

Retries exist to absorb infrastructure noise. They are not a flake strategy.

**Enforced by lint** (`eslint.config.mjs`) — these are errors, not warnings:
`playwright/no-wait-for-timeout`, `playwright/no-force-option`,
`playwright/no-skipped-test`, `@typescript-eslint/no-floating-promises`.
There is not a single `waitForTimeout` in this repository.

**Reproducing CI locally.** `npm run test:docker ui-webkit` runs a project inside
the Playwright container pinned to the installed version, so "green on my
machine, red in CI" is a two-minute question rather than a push-and-wait loop.
It also isolates the suite from endpoint-protection agents, which on a developer
laptop will happily `SIGKILL` Playwright's browser processes — that surfaces as
dozens of `browserType.launch failed` errors that look like test bugs and are
not. Both cross-browser runs below were verified this way.

**Enforced by design:**

| Rule                                                                      | Why                                                                                                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Web-first assertions (`toHaveText`, `toHaveCount`) over read-then-compare | They retry until the value settles; a bare read captures whatever happened to be there                                           |
| Every page defines `expectLoaded()` against a real DOM anchor             | The catalogue renders client-side, so `goto()` resolving proves nothing                                                          |
| Cart navigation waits for the `/viewcart` response                        | Otherwise "cart is empty" also passes on a page that has not fetched yet — an assertion that cannot fail                         |
| Wait on a widget's own readiness signal                                   | SweetAlert ignores clicks until it adds a `visible` class 500 ms after opening; the fix is to wait for that class, never a sleep |
| Assert the state that implies a navigation completed                      | The app hides the login modal and immediately reloads; asserting the welcome label first removes the race                        |

Five of the six entries above are bugs that were found and fixed **in this
framework** while stabilising it across Chromium, Firefox and WebKit. Each one is
written up in [`docs/findings.md`](docs/findings.md), because the fix is the
standard and the standard is what a team inherits.

### Flaky-test policy

1. A test that only passes on retry is **triaged, not ignored** — CI reports the
   retry, and the run is not clean just because it went green.
2. Fix the cause, or quarantine with an owner and an expiry. Never both silently.
3. `test.skip()` is a lint error. Confirmed product defects use `test.fail()`
   instead, so the check keeps running and turns red the day the bug is fixed.

---

## Configuration

Nothing environment-specific lives in a spec. `config/index.ts` resolves and
validates every knob once, at load, and throws on a malformed value — so a typo is
a startup error rather than a silently skipped assertion.

| Variable                                                    | Default                                                  | Purpose                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| `TEST_ENV`                                                  | `production`                                             | Which profile from `config/environments.ts`                   |
| `BASE_URL`, `API_BASE_URL`                                  | from profile                                             | Per-run override — point at a preview URL with no code change |
| `HEADLESS`, `WORKERS`, `RETRIES`                            | `true`, auto, `0` (CI: `2`)                              | Execution                                                     |
| `ACTION_TIMEOUT_MS`, `EXPECT_TIMEOUT_MS`, `TEST_TIMEOUT_MS` | `10000`, `7000`, `60000`                                 | Timeouts                                                      |
| `TRACE`, `VIDEO`, `SCREENSHOT`                              | `on-first-retry`, `retain-on-failure`, `only-on-failure` | Artifacts                                                     |
| `PERF_BUDGET_*`                                             | see `.env.example`                                       | Performance budgets                                           |

---

## Reporting

- **HTML report** with traces, screenshots and video on failure — `npm run report`
- **JUnit XML** for CI test reporting — `test-results/junit.xml`
- **JSON** for custom dashboards — `test-results/results.json`
- **GitHub annotations** on CI, so failures appear inline on the pull request
- **Attachments**: each test attaches the ephemeral account it used, and
  performance tests attach their raw metrics, so a regression can be diffed
  run-over-run from the report rather than reconstructed from a log

Sharded CI runs write `blob` reports that are merged into a single HTML report.

---

## CI/CD

[`.github/workflows/e2e.yml`](.github/workflows/e2e.yml). The pipeline shape
mirrors the cost of each signal:

| Job           | Runs on          | Duration | Why there                                                                                                                   |
| ------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `verify`      | every push/PR    | seconds  | Format, lint, types. Nothing else runs if this fails                                                                        |
| `api`         | every push/PR    | ~1 min   | No browser download, no browser launch — cheap enough to gate everything                                                    |
| `ui`          | every push/PR    | minutes  | 3 browsers × 2 shards in parallel; blob reports merged afterwards                                                           |
| `report`      | after `ui`       | ~1 min   | Merges shards into one HTML report artifact                                                                                 |
| `performance` | nightly + manual | ~5 min   | Timing assertions on a contended PR runner measure the runner, not the app — so they run on a schedule with relaxed budgets |

Portable by construction: it is `npx playwright test` plus environment variables.
The same commands run unchanged under Jenkins, GitLab CI or locally.

---

## Test types

| Type            | Where                | Notes                                                                                                              |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **UI**          | `tests/ui/`          | Login and Cart journeys, across 5 browser/device projects                                                          |
| **API**         | `tests/api/`         | Auth, cart and catalogue contracts — including multi-tenant cart isolation, which a single-user UI test cannot see |
| **Regression**  | `@regression` tag    | Currently the full functional suite                                                                                |
| **Smoke**       | `@smoke` tag         | Critical path only — login, add to cart, checkout                                                                  |
| **Performance** | `tests/performance/` | Budget regression: navigation timings and API p95, asserted against configurable budgets                           |

**On performance, stated honestly:** this is _budget regression testing on a single
client_ — "did this change make it slower for one user" — which a functional
pipeline can answer cheaply and repeatedly. It is not load testing. Throughput and
concurrency belong in k6 against a dedicated environment; putting load tests in
Playwright produces numbers nobody should trust. The boundary is deliberate.

---

## AI-assisted workflow

How AI is actually used on this codebase, and where it is not trusted:

| Stage           | Use                                                                                                            | Guardrail                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exploration** | Derive the real API contract and the app's client JS behaviour before writing a line of test code              | Every claim verified against the live service — `docs/api-contract.md` is observed, not assumed                                                      |
| **Generation**  | Draft page objects and edge-case matrices from the app's own markup and JS                                     | Generated code is reviewed against the layering rule; nothing merges that a human would not have written                                             |
| **Triage**      | Failure context (`error-context.md`, traces, DOM snapshots) is machine-readable and used to isolate root cause | A fix is only accepted once the _mechanism_ is understood — see the SweetAlert `visible` class finding, which a naive assistant "fixes" with a sleep |
| **Maintenance** | Selector and assertion updates proposed from diffs                                                             | Locator strategy is policy: role/text over ids the app duplicates                                                                                    |

The standard the team is held to: **AI accelerates understanding; it does not
replace it.** Every generated wait must name the signal it waits for. "It passes
now" is not a review comment.

---

## What this suite found

**15 defects** in the application under test — 9 pinned by an executable check, the
rest by documented manual cases. The ones that would matter in production:

|             |                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| **DEMO-3**  | An empty cart checks out for $0 and issues a real order id                                                                  |
| **DEMO-11** | No rate limiting or lockout — 20 consecutive failed logins were all accepted, verified against the live API                 |
| **DEMO-14** | The receipt displays the full card number unmasked                                                                          |
| **DEMO-15** | The order confirmation is rendered before the server confirms, so a customer can be told an order succeeded when it did not |
| **DEMO-2**  | `POST /login` returns HTTP 500 with an HTML body on an empty username                                                       |
| **DEMO-1**  | Every receipt is dated one month early (zero-indexed `getMonth()`)                                                          |

Full list with severity, verification method and the test that pins each one:
[`docs/findings.md`](docs/findings.md).

---

## Extending it

**A new page:** add a page object under `src/pages/` extending `BasePage`, implement
`expectLoaded()`, expose it as a fixture. No existing file changes.

**A new browser or device:** one entry in `playwright.config.ts` `projects`.

**A new environment:** one entry in `config/environments.ts`.

**A new test type:** a new project with its own `testDir`.

The test for whether the architecture is holding: adding coverage should require
_adding_ files, not editing existing ones.
