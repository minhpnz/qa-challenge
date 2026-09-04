# Importing the test case suite into Google Sheets

The suite is generated from `scripts/test_case_data.py`; these CSVs are the
import-ready form of [`../DemoBlaze-Test-Cases.xlsx`](../DemoBlaze-Test-Cases.xlsx).

| File                      | Becomes the tab  |
| ------------------------- | ---------------- |
| `01-summary.csv`          | Summary          |
| `02-login-test-cases.csv` | Login Test Cases |
| `03-cart-test-cases.csv`  | Cart Test Cases  |
| `04-defects.csv`          | Defects          |

## Option A — upload the workbook (keeps formatting and the live formulas)

1. Google Sheets → **File → Import → Upload** → `DemoBlaze-Test-Cases.xlsx`
2. Choose **Replace spreadsheet**.

All four tabs, the header styling, the frozen panes, the filters, the
dropdown validation and the Summary COUNTIF formulas come across intact.

## Option B — import the CSVs tab by tab

For each file, in order:

1. **File → Import → Upload** → select the CSV
2. Import location: **Insert new sheet(s)**
3. Separator: **Comma**; leave "Convert text to numbers/dates" **off** so
   test data such as `12` / `2030` and IDs stay as written
4. Rename the new tab per the table above, then delete the default `Sheet1`

Then, on the Summary tab, restore the live counts (Option A gives you these for
free):

```
=COUNTA('Login Test Cases'!A2:A45)
=COUNTIF('Login Test Cases'!D2:D45,"Functional")
=COUNTIF('Login Test Cases'!E2:E45,"P0")
=COUNTIF('Login Test Cases'!J2:J45,"Yes")
```

## After importing

- Freeze the header row: **View → Freeze → 1 row**
- Turn on filters: **Data → Create a filter**
- Set the sharing link to **Anyone with the link — Viewer** before submitting

## Regenerating

Edit `scripts/test_case_data.py`, then:

```bash
python3 scripts/generate_test_cases.py
```

The spreadsheet is generated rather than hand-maintained so the suite is
reviewable in a pull request, diffable over time, and impossible to desync from
the automation references it cites.
