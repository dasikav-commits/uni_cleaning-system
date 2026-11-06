"""Builds docs/Feature_Acceptance_Checklist_University_Cleaning_Monitoring_System.pdf.

Layout follows the "Feature Acceptance Checklist" used for the Student Exam & Results
Management System.

    pip install reportlab
    python docs/feature-checklist/generate_checklist.py [--fonts DIR]

DIR may contain Carlito-400-normal.ttf, Carlito-400-italic.ttf and
Carlito-700-normal.ttf (Carlito is metric-compatible with Calibri). Without them
Helvetica is used.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "docs" / "Feature_Acceptance_Checklist_University_Cleaning_Monitoring_System.pdf"

SYSTEM_TITLE = "University Cleaning Monitoring System"
CLIENT = "Wayamba University of Sri Lanka (Kuliyapitiya Premises)"

# (main feature, feature, implemented, remarks)
FEATURES = [
    (
        "Authentication & Accounts",
        "E-mail login, sign-up with e-mail verification, password reset, profile, role-based dashboards",
        "Yes",
        "Open: enable \u201cConfirm email\u201d and custom SMTP in Supabase for live e-mails.",
    ),
    (
        "Logins & Administration",
        "DR creates and deactivates logins (PHI, Faculty, Sub-Warden, Curator, Unit), assignments, audit log",
        "Yes",
        "Each login sees only its assigned locations; users with history are deactivated.",
    ),
    (
        "BOQ & Locations",
        "Kuliyapitiya BOQ (28 services, 329 items) in one click; edit items, frequencies, amounts",
        "Yes",
        "Monthly BOQ Rs. 7,398,637.98. Open: Toilet Pit rates, Daycare item amounts.",
    ),
    (
        "Evaluation Cleaning Reports",
        "Row-by-row report, tick pop-up per scheduled occurrence, rate-based pits and dogs & cats",
        "Yes",
        "Deduction % = missed \u00f7 scheduled; DR accepts, returns or accepts all.",
    ),
    (
        "PHI Attendance",
        "Daily attendance sheet, monthly report from the daily totals, sent to the DR",
        "Yes",
        "DR approves or asks for a correction; daily sheet locks once sent.",
    ),
    (
        "Monthly Reports & Payment",
        "Amount of Work Done, Attendance report, Cleaning & Janitorial Services report",
        "Yes",
        "Payable = approved less absence deduction; frozen on finalize, can be reopened.",
    ),
    (
        "Notifications & Exports",
        "In-app and e-mail notifications on submit, return, accept, finalize; print and Excel",
        "Yes",
        "Open: set SMTP_* and APP_URL on the server for e-mail delivery.",
    ),
]

DECLARATION = (
    "By signing below, the client confirms that the features marked as Implemented above have been "
    "demonstrated and tested, and are accepted as satisfying the corresponding requirements. Items marked "
    "as Open in the Remarks remain open and do not constitute acceptance. Acceptance of the features "
    "listed here does not waive any warranty, support or defect-rectification obligation agreed in the contract."
)

NAVY = HexColor("#1F4E79")
LABEL_BG = HexColor("#E9ECF7")
VALUE_BG = HexColor("#F8F9FC")
GRID = HexColor("#7F7F7F")
MUTED = HexColor("#7F7F7F")


def register_fonts(font_dir: Path | None) -> tuple[str, str, str]:
    if font_dir:
        files = {
            "Carlito": font_dir / "Carlito-400-normal.ttf",
            "Carlito-Italic": font_dir / "Carlito-400-italic.ttf",
            "Carlito-Bold": font_dir / "Carlito-700-normal.ttf",
        }
        if all(path.exists() for path in files.values()):
            for name, path in files.items():
                pdfmetrics.registerFont(TTFont(name, str(path)))
            return "Carlito", "Carlito-Bold", "Carlito-Italic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


def build(font_dir: Path | None) -> Path:
    regular, bold, italic = register_fonts(font_dir)

    title = ParagraphStyle("title", fontName=bold, fontSize=16, leading=20, alignment=TA_CENTER, textColor=NAVY)
    subtitle = ParagraphStyle("subtitle", fontName=italic, fontSize=8.6, leading=11, alignment=TA_CENTER, textColor=MUTED)
    section = ParagraphStyle("section", fontName=bold, fontSize=11.1, leading=14, textColor=NAVY)
    label = ParagraphStyle("label", fontName=bold, fontSize=8.6, leading=11)
    value = ParagraphStyle("value", fontName=regular, fontSize=8.6, leading=11)
    system_value = ParagraphStyle("system", fontName=bold, fontSize=11.1, leading=14, textColor=NAVY)
    head = ParagraphStyle("head", fontName=bold, fontSize=11.1, leading=14, alignment=TA_CENTER, textColor=white)
    cell = ParagraphStyle("cell", fontName=regular, fontSize=8.1, leading=10.4)
    cell_bold = ParagraphStyle("cellBold", parent=cell, fontName=bold)
    cell_center = ParagraphStyle("cellCenter", parent=cell_bold, alignment=TA_CENTER)
    body = ParagraphStyle("body", fontName=regular, fontSize=9.6, leading=14, alignment=TA_LEFT)
    sign_head = ParagraphStyle("signHead", fontName=bold, fontSize=8.6, leading=11, alignment=TA_CENTER, textColor=white)
    sign_line = ParagraphStyle("signLine", fontName=regular, fontSize=8.6, leading=14)

    margin = 51
    width = A4[0] - 2 * margin
    story: list = [
        Paragraph("FEATURE ACCEPTANCE CHECKLIST", title),
        Spacer(1, 4),
        Paragraph("Client confirmation of implemented features", subtitle),
        Spacer(1, 16),
    ]

    info = Table(
        [
            [Paragraph("SYSTEM TITLE", label), Paragraph(SYSTEM_TITLE, system_value)],
            [Paragraph("Client / Organization", label), Paragraph(CLIENT, value)],
            [Paragraph("Date of Acceptance", label), Paragraph("", value)],
            [Paragraph("Verified by (Name &amp; Designation)", label), Paragraph("", value)],
        ],
        colWidths=[width / 2, width / 2],
        rowHeights=[33, 18.5, 18.5, 18.5],
    )
    info.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.6, GRID),
                ("BACKGROUND", (0, 0), (0, -1), LABEL_BG),
                ("BACKGROUND", (1, 0), (1, 0), VALUE_BG),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story += [info, Spacer(1, 14), Paragraph("Features", section), Spacer(1, 6)]

    rows = [[Paragraph(text, head) for text in ("Main Feature", "Feature", "Implemented", "Remarks")]]
    for main, feature, implemented, remarks in FEATURES:
        rows.append(
            [
                Paragraph(main.replace("&", "&amp;"), cell_bold),
                Paragraph(feature.replace("&", "&amp;"), cell),
                Paragraph(implemented, cell_center),
                Paragraph(remarks.replace("&", "&amp;"), cell),
            ]
        )
    features = Table(rows, colWidths=[width / 4] * 4, repeatRows=1)
    features.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.6, GRID),
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
                ("TOPPADDING", (0, 1), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 4.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story += [features, Spacer(1, 12), Paragraph("Declaration", section), Spacer(1, 6), Paragraph(DECLARATION, body), Spacer(1, 12)]

    line = "_" * 34
    sign = Table(
        [
            [Paragraph("For the Client", sign_head)],
            [
                [
                    Paragraph(f"<font name='{bold}'>Name:</font> <font color='#9AA3B2'>{line}</font>", sign_line),
                    Paragraph(f"<font name='{bold}'>Signature:</font> <font color='#9AA3B2'>{line}</font>", sign_line),
                    Spacer(1, 4),
                    Paragraph(f"<font name='{bold}'>Date:</font> <font color='#9AA3B2'>{line}</font>", sign_line),
                ]
            ],
        ],
        colWidths=[width / 2],
        rowHeights=[17, 110],
    )
    sign.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.6, GRID),
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("BACKGROUND", (0, 1), (-1, 1), VALUE_BG),
                ("VALIGN", (0, 0), (-1, 0), "MIDDLE"),
                ("VALIGN", (0, 1), (-1, 1), "TOP"),
                ("TOPPADDING", (0, 1), (-1, 1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    sign.hAlign = "CENTER"
    story.append(KeepTogether([sign]))

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(regular, 8.6)
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(A4[0] / 2, 28, f"{doc.page} of 1")
        canvas.restoreState()

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=36,
        bottomMargin=44,
        title=f"Feature Acceptance Checklist - {SYSTEM_TITLE}",
        author="Dasika Ruvishan",
        subject="Client confirmation of implemented features",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return OUTPUT


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--fonts", type=Path, help="Folder with the Carlito TTF files")
    print(build(parser.parse_args().fonts))
