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

- [ ] **Cross-browser / cross-platform support** (Chromium, Firefox, WebKit; desktop + mobile viewports)
- [ ] **Modular design** for ease of updates and scalability (Page Objects / fixtures / layered structure)
- [ ] **CI/CD compatibility** (GitHub Actions, Jenkins, GitLab CI, etc.) for automated execution
- [ ] **Configurable parameters** (env, base URL, credentials, workers, retries, tags)
- [ ] **Comprehensive reporting** (HTML report, traces, screenshots, videos on failure)
- [ ] **Support for multiple test types**: **UI**, **API**, **regression**, **performance**

### 2.3 Automation Implementation Demo

Build a basic automation demo on DemoBlaze covering:

- [ ] **Login with valid credentials**
- [ ] **Add to cart → place an order**

Scripts must include **appropriate validations** and handle **both typical and edge case
scenarios gracefully** (stable waits, no hard sleeps, deterministic test data, clean teardown).

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
- [ ] **Push to a public GitHub repo** and put the link in the submission email. ← only remaining deliverable

### Verification status

| Suite                                        | Result                                                                                | When          |
| -------------------------------------------- | ------------------------------------------------------------------------------------- | ------------- |
| API (19 tests)                               | ✅ 19/19 in 7.1s                                                                      | quiet machine |
| UI Chromium (29 tests)                       | ✅ 29/29 in 1.0m                                                                      | quiet machine |
| UI Firefox / WebKit                          | ⚠️ partial — see note                                                                 |               |
| Lint + format + typecheck (`npm run verify`) | ✅ clean                                                                              | current       |
| Workbook formulas (32)                       | ✅ no unknown sheets/functions/ranges; all 22 COUNTIF/COUNTA independently recomputed | current       |

**Note on the last runs:** macOS XProtect (peaked ~489% CPU) and Avira (~285%) began
scanning the freshly-installed Playwright browser binaries and `node_modules`, driving
load average past 400. Under that, even the browserless API suite went from 7s to 10.8
minutes with navigation timeouts — the machine, not the code. Three changes landed after
the last clean browser run (cart specs restructured onto a `beforeEach` precondition hook,
`video` default changed to `on-first-retry`, `loggedInUser` fixture simplified); they pass
`npm run verify` but want one clean `npm run test:ci` once the scans finish. Excluding this
directory from Avira would also help.

### Google Sheet

Destination sheet (currently empty, publicly readable):
https://docs.google.com/spreadsheets/d/1RFBl-dfosbwtPEpF2U1ENG3hvF3ey_ou7N26z6E1m-A/edit

There is no write access from this environment, so the content is delivered as the
`.xlsx` (upload it with **File → Import → Replace spreadsheet** to keep formatting and
formulas) and as per-tab CSVs. Full instructions: `docs/test-cases-csv/README.md`.
Set the link to **Anyone with the link — Viewer** before submitting.
