# QA Automation Challenge — Task Brief

> Working memory for this repo. Read this first each session.
> Target role: **Senior QA Automation Lead** (Playwright + TypeScript, framework architecture,
> AI-augmented automation, team multiplier).

---

## 1. Purpose

This task evaluates capability in:

1. **Test case documentation** — writing a well-rounded, reviewable test suite spec.
2. **Framework architecture** — designing a scalable E2E automation framework.
3. **Hands-on automation proficiency** — working demo scripts with real validations.

Application under test: **https://www.demoblaze.com/**
Modules in scope: **Login** and **Cart**.

---

## 2. Challenge Overview

### 2.1 Test Case Documentation

Review the Login and Cart features of https://www.demoblaze.com/ and develop a well-rounded
suite of test cases covering:

- **Functional scenarios** — happy paths, core business flows.
- **Edge cases** — boundaries, unusual-but-valid input, state transitions, persistence.
- **Negative paths** — invalid input, auth failures, error handling.

Documented clearly in **Excel or Google Sheet** format.

### 2.2 End-to-End Automation Framework

Outline and build a straightforward E2E automation framework using a modern tool —
**Playwright (preferred)**, Cypress, or equivalent — with **TypeScript**.

The framework must incorporate:

- [x] **Cross-browser / cross-platform support** — 5 projects: `ui-chromium`, `ui-firefox`, `ui-webkit`, `ui-mobile-chrome` (Pixel 7), `ui-mobile-safari` (iPhone 14). Adding one is a config entry, not a fork of the suite.
- [x] **Modular design** — layered `config → core → pages/components/api → fixtures → tests`, dependencies pointing one way. A spec never builds a page object, reads env, or holds a selector. Adding coverage adds files rather than editing them.
- [x] **CI/CD compatibility** — `.github/workflows/e2e.yml`: `verify → api → ui (3 browsers × 2 shards) → merged report`, plus nightly performance. Portable by construction — it is `npx playwright test` plus env vars, so Jenkins/GitLab need no rewrite.
- [x] **Configurable parameters** — `config/index.ts` resolves and validates every knob once and throws on a malformed value. Environment profiles as data; per-run `BASE_URL`/`API_BASE_URL` overrides; workers, retries, timeouts, artifacts, perf budgets all env-driven.
- [x] **Comprehensive reporting** — HTML (traces, screenshots, video), JUnit XML, JSON, GitHub annotations on CI. Sharded runs write blob reports merged into one HTML report. Tests attach their ephemeral account and raw perf metrics for triage.
- [x] **Support for multiple test types** — UI (29 tests), API (19, no browser launched), performance (5, serial). Regression/smoke are **tags**, not folders, because scope-of-run is orthogonal to which layer a test exercises.

### 2.3 Automation Implementation Demo

Build a basic automation demo on DemoBlaze covering:

- [x] **Login with valid credentials** — `tests/ui/login/login.spec.ts › logs in with valid credentials @smoke`
- [x] **Add to cart → place an order** — `tests/ui/cart/add-to-cart.spec.ts › adds a product to the cart @smoke` and `tests/ui/cart/place-order.spec.ts › completes an order and reports the correct receipt @smoke`

Scripts must include **appropriate validations** and handle **both typical and edge case
scenarios gracefully** (stable waits, no hard sleeps, deterministic test data, clean teardown).

- [x] **Validations** — the checkout test parses the receipt and asserts amount, card, name and
      order id against what was submitted, then confirms the cart is empty **via the API**, not
      just the UI. A confirmation showing the wrong amount is a worse defect than no confirmation.
- [x] **Edge cases handled** — 29 of the 94 documented cases are edge cases; 17 are negative.
      Both are automated where an executable check is the right instrument.
- [x] **No hard sleeps** — zero `waitForTimeout` in the repo, enforced by ESLint
      (`playwright/no-wait-for-timeout` as an error, alongside `no-force-option` and `no-skipped-test`).
- [x] **Deterministic test data** — a UUID-suffixed account per test, created through the API;
      prices and ids resolved at runtime, never hardcoded.
- [x] **Clean teardown** — the cart is cleared per test; teardown failures are logged, never
      allowed to fail a test that already passed.

---

## 3. Deliverables (What to Submit)

| #   | Deliverable                                                                                                    | Format                                              | Status |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------ |
| 1   | **Test Case Suite** — thorough test cases for Login + Cart modules                                             | Excel / Google Sheet                                | ⏳     |
| 2   | **Automation Framework + Demo Scripts** — working framework, scripts covering Login and Cart use cases         | GitHub, **public repo**, link included in the email | ⏳     |
| 3   | **Documentation** — README covering (a) framework structure & rationale, (b) steps to execute the demo scripts | `README.md`                                         | ⏳     |

Submission notes:

- Repo **must be public**.
- Repo link goes in the submission email.

---

## 4. Role Context (what the evaluation is really probing)

The brief is scored against a **Senior QA Automation Lead** bar, not an SDET-I bar. Every
artifact should read as if it will be adopted by a whole QA org.

### 4.1 Responsibilities of the role

- Own automation **strategy, architecture, and standards** across multiple products and projects.
- **Lead, mentor, and grow** a team of automation engineers — success measured by them
  outperforming and outgrowing you.
- Design and evolve **scalable test frameworks and tooling** the whole QA org adopts.
- Drive **AI-augmented automation** (AI-assisted test generation, maintenance, triage) and hold
  AI competency as a **baseline standard**.
- Own **coverage, reliability, and test infrastructure** — CI/CD integration, reporting,
  **flaky-test reduction**.
- Set and continuously **raise the technical bar** for automation code craftsmanship.
- Partner with **devs, PMs, architects, QA Leads** to embed quality into delivery.
- Stay **hands-on** — write and review automation code, unblock the team, set standards by example.
- Build the **talent bench** — contribute to hiring, keep a pipeline of strong candidates warm.

### 4.2 Requirements

- 6+ years in test automation, deep hands-on **Playwright + TypeScript** (or strong equivalent),
  including **framework architecture**.
- Proven experience **leading, mentoring, growing** automation engineers.
- **AI competency (required)** — fluent in applying AI tools to automation and driving adoption.
- **Core values alignment (required)** — high autonomy, high ownership, bar-raising mindset.
- **Multiplier track record** — tooling + people whose combined impact exceeds your own output.
- Strong programming fundamentals, advocate of **code craftsmanship**.
- **CI/CD, test infrastructure, DevOps tooling** experience.
- Runs the automation function **autonomously** — creates clarity and standards, no hand-holding.
- Hires people who **challenge and stretch** the team — for capability and growth, not control.

### 4.3 What that implies for these deliverables

| Signal they look for      | How to show it here                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| Architecture, not scripts | Layered framework (config → fixtures → page objects → flows → specs), no logic in specs              |
| Scalability               | Adding a new module must not require touching existing code                                          |
| Reliability ownership     | Web-first assertions, zero `waitForTimeout`, retries policy, flaky quarantine strategy documented    |
| CI/CD ownership           | Real GitHub Actions workflow: matrix browsers, sharding, artifact upload, report publishing          |
| Multi-test-type support   | UI + API (auth/cart endpoints) + regression tagging + a perf smoke                                   |
| AI competency             | Documented AI-assisted workflow: test generation, selector healing, failure triage — with guardrails |
| Craftsmanship             | Typed everything, lint + format + typecheck gates, small pure helpers, meaningful names              |
| Bar-raising / mentoring   | README rationale section written as team standards + "why this, not that" trade-offs                 |

---

## 5. Working Principles for This Repo

- **Rationale over cleverness** — every architectural choice gets a "why this, not that" note.
- **No flake by construction** — deterministic data, isolated state, web-first assertions.
- **Config-driven** — nothing environment-specific hardcoded in a spec.
- **Everything runs in CI** — if it can't run headless in a container, it isn't done.
- **Docs are a deliverable**, not an afterthought — README is graded.

---

## 6. Status

**Created:** 2026-09-04 · **Last updated:** 2026-09-05

- [x] Repo initialized, `task.md` written.
- [x] **Framework** (Playwright + TypeScript). Layered `config → core → pages/components/api → fixtures → tests`.
      5 browser/device projects + `api` + `performance` + a fail-fast health gate.
- [x] **Demo specs**: log in with valid credentials; add to cart → place an order.
      Both are `@smoke` tagged and assert the receipt against the cart total.
- [x] **Test types**: UI (29 tests), API (19), performance (5); smoke/regression as tags, not folders.
- [x] **CI/CD**: `.github/workflows/e2e.yml` — verify → api → sharded cross-browser ui → merged report;
      performance budgets nightly.
- [x] **Reporting**: HTML + JUnit + JSON + GitHub annotations; traces/screenshots/video on failure.
- [x] **README** — structure, rationale ("why this, not that"), run steps, flaky-test policy, AI workflow.
- [x] **Test case suite** — 94 cases (44 Login / 50 Cart) in `docs/DemoBlaze-Test-Cases.xlsx`,
      4 tabs, live COUNTIF summary, dropdown validation, per-case automation references.
      Import-ready CSVs + Google Sheets instructions in `docs/test-cases-csv/`.
      Generated from `scripts/test_case_data.py` so it stays reviewable and diffable.
- [x] **Findings**: 15 defects in the AUT documented in `docs/findings.md` (9 pinned by automated tests),
      plus 7 framework-side flake lessons written up as standards.
- [ ] **Push to a public GitHub repo** and put the link in the submission email.
      **Owner: repo author** (decided 2026-09-05 — the repo will be created manually).
      Everything else is done; the working tree is clean and all commits are ready to push.

### Pushing (once the empty repo exists on GitHub)

Create the repo on GitHub **without** a README, .gitignore or licence — the local
history already has them and an initialised remote would force a merge. Then:

```bash
cd ~/Developer/learn/qa
git remote add origin git@github.com:minhpnz/<repo-name>.git
git push -u origin main
```

`gh` is already authenticated as `minhpnz` over SSH, so no further login is needed.
Before sending the link, confirm the repo is set to **Public** in Settings.

Nothing sensitive is tracked: `.env` is gitignored (only `.env.example` is committed,
holding defaults and no secrets), and the suite creates its own throwaway accounts at
runtime, so no credentials exist in the history.

### Verification status

Cross-browser runs were done in the official Playwright container
(`npm run test:docker <project>`) — the same Linux image CI targets, and the only
way to get a trustworthy result on this machine (see the note below).

| Suite                     | Result                                                                       | How                       |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------- |
| API (19 tests)            | ✅ 19/19 in 7.6s — also passes with **no browsers installed**, as CI runs it | host + empty browser path |
| UI Chromium (29 tests)    | ✅ 29/29 in 1.0m                                                             | host                      |
| UI Firefox (29 tests)     | ✅ 29/29 in 2.4m                                                             | Docker                    |
| UI WebKit (29 tests)      | ✅ 28 passed + 1 flaky (passed on retry) in 3.2m — under triage              | Docker                    |
| Performance (5 tests)     | ✅ API latency 2/2; page budgets 4/5 repeats (1 lost to an external SIGKILL) | host                      |
| Lint + format + typecheck | ✅ `npm run verify` clean                                                    | host                      |
| Clean clone               | ✅ all deliverables present, no stray artifacts, lockfile committed          | `git clone` to a temp dir |
| Workbook formulas (32)    | ✅ no unknown sheets/functions/ranges; 22 COUNTIF/COUNTA recomputed          | static validation         |
| Workbook cross-references | ✅ every defect reachable from a case and back; no duplicate or dangling IDs | integrity script          |

**Note — browser failures on this host are external, not the framework.** Playwright's
browser processes are **SIGKILLed mid-run** by the Avira system extension
(`com.avira.scanservice`), with `kill EPERM` in the browser log. A host cross-browser
run gave 56 failed / 1 passed — and every single failure was a launch or process kill,
with **zero assertion failures**. The identical suite is green in Docker. Full Chromium
(`channel: 'chromium'`) will not launch on this host at all.

To run cross-browser natively, add this directory and `~/Library/Caches/ms-playwright`
to the Avira exclusion list. CI is unaffected — GitHub runners have no such agent.

### Google Sheet

Destination sheet (currently empty, publicly readable):
https://docs.google.com/spreadsheets/d/1RFBl-dfosbwtPEpF2U1ENG3hvF3ey_ou7N26z6E1m-A/edit

There is no write access from this environment, so the content is delivered as the
`.xlsx` (upload it with **File → Import → Replace spreadsheet** to keep formatting and
formulas) and as per-tab CSVs. Full instructions: `docs/test-cases-csv/README.md`.
Set the link to **Anyone with the link — Viewer** before submitting.
