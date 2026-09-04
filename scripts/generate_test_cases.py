"""Generate the test case workbook and import-ready CSVs from test_case_data.py."""

import csv
import os
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_case_data import CART, DEFECTS, LOGIN  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_XLSX = os.path.join(ROOT, "docs", "DemoBlaze-Test-Cases.xlsx")
OUT_CSV_DIR = os.path.join(ROOT, "docs", "test-cases-csv")

NAVY = "1F3864"
LIGHT = "D9E2F3"
BAND = "F2F5FB"
AMBER = "FFF2CC"
GREY = "808080"

HEADERS = [
    "Test Case ID", "Feature Area", "Title", "Type", "Priority", "Preconditions",
    "Test Steps", "Test Data", "Expected Result", "Automated",
    "Automation Reference", "Defect ID",
]
WIDTHS = [14, 18, 46, 13, 9, 30, 46, 26, 58, 11, 52, 12]

DEFECT_HEADERS = [
    "Defect ID", "Area", "Severity", "Likelihood", "Status", "Summary",
    "Detail", "Test Case ID", "Pinned By",
]
DEFECT_WIDTHS = [11, 12, 10, 11, 9, 46, 72, 20, 60]

thin = Side(style="thin", color="BFBFBF")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)


def style_header(ws, headers, widths):
    for col, (title, width) in enumerate(zip(headers, widths), start=1):
        cell = ws.cell(row=1, column=col, value=title)
        cell.font = Font(bold=True, color="FFFFFF", size=11)
        cell.fill = PatternFill("solid", start_color=NAVY)
        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        cell.border = BORDER
        ws.column_dimensions[get_column_letter(col)].width = width
    ws.row_dimensions[1].height = 26
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(headers))}1"


def write_cases(ws, rows):
    style_header(ws, HEADERS, WIDTHS)
    for i, (cid, area, title, ttype, prio, pre, steps, data, expected, ref, defect) in enumerate(rows):
        r = i + 2
        automated = "No" if not ref or ref == "Manual" else "Yes"
        values = [cid, area, title, ttype, prio, pre, steps, data, expected, automated, ref or "—", defect or "—"]
        for col, value in enumerate(values, start=1):
            cell = ws.cell(row=r, column=col, value=value)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = BORDER
            if i % 2:
                cell.fill = PatternFill("solid", start_color=BAND)
        ws.cell(row=r, column=1).font = Font(bold=True)
        if prio == "P0":
            ws.cell(row=r, column=5).font = Font(bold=True, color="C00000")
        if automated == "Yes":
            ws.cell(row=r, column=10).font = Font(color="1F7A1F", bold=True)
        else:
            ws.cell(row=r, column=10).font = Font(color=GREY)
        if defect:
            ws.cell(row=r, column=12).fill = PatternFill("solid", start_color=AMBER)
        ws.row_dimensions[r].height = None

    last = len(rows) + 1
    for column, options in (
        ("D", '"Functional,Negative,Edge case,Security,UI"'),
        ("E", '"P0,P1,P2"'),
        ("J", '"Yes,No"'),
    ):
        dv = DataValidation(type="list", formula1=options, allow_blank=False)
        ws.add_data_validation(dv)
        dv.add(f"{column}2:{column}{last}")
    return last


def write_defects(ws, rows):
    style_header(ws, DEFECT_HEADERS, DEFECT_WIDTHS)
    severity_colour = {"High": "C00000", "Medium": "BF8F00", "Low": "808080"}
    for i, row in enumerate(rows):
        r = i + 2
        for col, value in enumerate(row, start=1):
            cell = ws.cell(row=r, column=col, value=value)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = BORDER
            if i % 2:
                cell.fill = PatternFill("solid", start_color=BAND)
        ws.cell(row=r, column=1).font = Font(bold=True)
        ws.cell(row=r, column=3).font = Font(bold=True, color=severity_colour.get(row[2], "000000"))


def write_summary(ws, n_login, n_cart, n_defects):
    ws.column_dimensions["A"].width = 46
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 14
    ws.column_dimensions["D"].width = 14
    ws.column_dimensions["E"].width = 70

    def heading(row, text):
        c = ws.cell(row=row, column=1, value=text)
        c.font = Font(bold=True, size=13, color=NAVY)

    title = ws.cell(row=1, column=1, value="DemoBlaze — Login & Cart Test Case Suite")
    title.font = Font(bold=True, size=16, color=NAVY)
    ws.cell(row=2, column=1, value="Application under test: https://www.demoblaze.com/").font = Font(italic=True)
    ws.cell(row=3, column=1, value="Scope: Login (incl. registration as a dependency) and Cart / Checkout")
    ws.cell(row=4, column=1, value="Generated from scripts/test_case_data.py — regenerate with: python3 scripts/generate_test_cases.py").font = Font(italic=True, color=GREY)

    login_r, cart_r = f"2:{n_login + 1}", f"2:{n_cart + 1}"
    L = f"'Login Test Cases'!$A${login_r.split(':')[0]}:$A${n_login + 1}"
    C = f"'Cart Test Cases'!$A$2:$A${n_cart + 1}"

    heading(6, "Coverage")
    for col, text in enumerate(["Metric", "Login", "Cart", "Total"], start=1):
        c = ws.cell(row=7, column=col, value=text)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", start_color=NAVY)

    def counts(row, name, formula_login, formula_cart, note=""):
        ws.cell(row=row, column=1, value=name).font = Font(bold=(name == "Total test cases"))
        ws.cell(row=row, column=2, value=formula_login)
        ws.cell(row=row, column=3, value=formula_cart)
        ws.cell(row=row, column=4, value=f"=B{row}+C{row}")
        if note:
            ws.cell(row=row, column=5, value=note).alignment = Alignment(wrap_text=True, vertical="top")

    counts(8, "Total test cases", f"=COUNTA({L})", f"=COUNTA({C})")
    for offset, ttype in enumerate(["Functional", "Negative", "Edge case", "Security", "UI"]):
        counts(
            9 + offset, f"  {ttype}",
            f"=COUNTIF('Login Test Cases'!$D$2:$D${n_login + 1},\"{ttype}\")",
            f"=COUNTIF('Cart Test Cases'!$D$2:$D${n_cart + 1},\"{ttype}\")",
        )
    counts(14, "P0 (critical path)",
           f"=COUNTIF('Login Test Cases'!$E$2:$E${n_login + 1},\"P0\")",
           f"=COUNTIF('Cart Test Cases'!$E$2:$E${n_cart + 1},\"P0\")")
    counts(15, "Automated",
           f"=COUNTIF('Login Test Cases'!$J$2:$J${n_login + 1},\"Yes\")",
           f"=COUNTIF('Cart Test Cases'!$J$2:$J${n_cart + 1},\"Yes\")",
           "Covered by the Playwright suite in this repository.")
    counts(16, "Manual / exploratory",
           f"=COUNTIF('Login Test Cases'!$J$2:$J${n_login + 1},\"No\")",
           f"=COUNTIF('Cart Test Cases'!$J$2:$J${n_cart + 1},\"No\")",
           "Deliberately not automated: browser-chrome behaviour (Escape, backdrop, browser Back), "
           "network-fault injection, and security probes that need a controlled environment.")
    ws.cell(row=17, column=1, value="Automation coverage").font = Font(bold=True)
    ws.cell(row=17, column=4, value="=IF(D8=0,0,D15/D8)").number_format = "0.0%"
    ws.cell(row=17, column=5, value="Share of documented cases with an executable check. P0 coverage is the number that gates a release, not this one.").alignment = Alignment(wrap_text=True, vertical="top")

    heading(19, "Defects raised")
    ws.cell(row=20, column=1, value="Total defects logged").font = Font(bold=True)
    ws.cell(row=20, column=2, value=f"=COUNTA(Defects!$A$2:$A${n_defects + 1})")
    for offset, severity in enumerate(["High", "Medium", "Low"]):
        ws.cell(row=21 + offset, column=1, value=f"  {severity} severity")
        ws.cell(row=21 + offset, column=2,
                value=f"=COUNTIF(Defects!$C$2:$C${n_defects + 1},\"{severity}\")")

    heading(25, "How to read this workbook")
    notes = [
        ("Login Test Cases", "44 cases covering authentication, session handling, validation, security and boundaries."),
        ("Cart Test Cases", "50 cases covering add-to-cart, cart management, persistence, isolation and checkout."),
        ("Defects", "Every issue this suite found in the application, cross-referenced to the case that exposes it."),
        ("Type", "Functional = intended behaviour. Negative = invalid input rejected. Edge case = boundary or unusual-but-valid. Security / UI as labelled."),
        ("Priority", "P0 = blocks release (login, add to cart, checkout, cross-account isolation). P1 = important. P2 = lower risk."),
        ("Automation Reference", "The exact spec and test title that executes the case, so a reviewer can jump from a row to running code."),
        ("Expected Result", "Where the app is defective, the row states BOTH the expected behaviour and the observed one, and names the defect. A test case that silently documents a bug as correct is worse than no test case."),
    ]
    for offset, (name, text) in enumerate(notes):
        ws.cell(row=26 + offset, column=1, value=name).font = Font(bold=True)
        cell = ws.cell(row=26 + offset, column=5, value=text)
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        ws.merge_cells(start_row=26 + offset, start_column=2, end_row=26 + offset, end_column=4)


def dump_csv(path, headers, rows):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)


def main():
    os.makedirs(os.path.dirname(OUT_XLSX), exist_ok=True)
    os.makedirs(OUT_CSV_DIR, exist_ok=True)

    wb = Workbook()
    summary = wb.active
    summary.title = "Summary"
    n_login = write_cases(wb.create_sheet("Login Test Cases"), LOGIN) - 1
    n_cart = write_cases(wb.create_sheet("Cart Test Cases"), CART) - 1
    write_defects(wb.create_sheet("Defects"), DEFECTS)
    write_summary(summary, n_login, n_cart, len(DEFECTS))
    summary.sheet_view.showGridLines = False
    wb.save(OUT_XLSX)

    def to_rows(cases):
        out = []
        for cid, area, title, ttype, prio, pre, steps, data, expected, ref, defect in cases:
            automated = "No" if not ref or ref == "Manual" else "Yes"
            out.append([cid, area, title, ttype, prio, pre, steps, data, expected,
                        automated, ref or "—", defect or "—"])
        return out

    dump_csv(os.path.join(OUT_CSV_DIR, "01-summary.csv"),
             ["Section", "Value"],
             [["Application under test", "https://www.demoblaze.com/"],
              ["Scope", "Login (incl. registration dependency) and Cart / Checkout"],
              ["Total test cases", len(LOGIN) + len(CART)],
              ["Login test cases", len(LOGIN)],
              ["Cart test cases", len(CART)],
              ["Automated", sum(1 for r in LOGIN + CART if r[9] and r[9] != "Manual")],
              ["Manual / exploratory", sum(1 for r in LOGIN + CART if not r[9] or r[9] == "Manual")],
              ["Defects raised", len(DEFECTS)]])
    dump_csv(os.path.join(OUT_CSV_DIR, "02-login-test-cases.csv"), HEADERS, to_rows(LOGIN))
    dump_csv(os.path.join(OUT_CSV_DIR, "03-cart-test-cases.csv"), HEADERS, to_rows(CART))
    dump_csv(os.path.join(OUT_CSV_DIR, "04-defects.csv"), DEFECT_HEADERS, [list(r) for r in DEFECTS])

    print(f"xlsx: {OUT_XLSX}")
    print(f"csv:  {OUT_CSV_DIR}")
    print(f"login={len(LOGIN)} cart={len(CART)} defects={len(DEFECTS)}")


if __name__ == "__main__":
    main()
