from pathlib import Path
from shutil import copy2

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle


OUTPUT = Path(__file__).resolve().parents[1] / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)
PUBLIC = Path(__file__).resolve().parents[1] / "public" / "demo-documents"
PUBLIC.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor("#17324D")
BLUE = colors.HexColor("#0B5CAB")
TEAL = colors.HexColor("#087F8C")
GOLD = colors.HexColor("#C99A35")
LIGHT = colors.HexColor("#EEF4F8")
RED = colors.HexColor("#B42318")
MUTED = colors.HexColor("#5B6770")


def watermark(c, width, height, text="FICTIONAL DEMO - NOT VALID"):
    c.saveState()
    c.setFillColor(colors.Color(0.72, 0.08, 0.08, alpha=0.10))
    c.setFont("Helvetica-Bold", 32)
    c.translate(width / 2, height / 2)
    c.rotate(28)
    c.drawCentredString(0, 0, text)
    c.restoreState()


def footer(c, width, text):
    c.setStrokeColor(colors.HexColor("#D8E1E8"))
    c.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(18 * mm, 9 * mm, text)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(width - 18 * mm, 9 * mm, "DEMO ONLY - NO LEGAL OR TRAVEL VALUE")


def label_value(c, x, y, label, value, width=58 * mm):
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 6.5)
    c.drawString(x, y, label.upper())
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    c.drawString(x, y - 5 * mm, value)
    c.setStrokeColor(colors.HexColor("#CBD7DF"))
    c.line(x, y - 7 * mm, x + width, y - 7 * mm)


def passport():
    path = OUTPUT / "demo-passport-aarav-mehta.pdf"
    width, height = landscape(A4)
    c = canvas.Canvas(str(path), pagesize=(width, height), pageCompression=1)
    c.setTitle("Fictional Demo Passport - Aarav Mehta")
    c.setAuthor("Adaptive Visitor Visa WebMCP Demo")
    c.setFillColor(colors.HexColor("#F8F3E8"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setFillColor(INK)
    c.rect(0, height - 32 * mm, width, 32 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(18 * mm, height - 17 * mm, "REPUBLIC OF INDIA - DEMONSTRATION PASSPORT")
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, height - 23 * mm, "Sample identity document created exclusively for the WebMCP application demo")
    c.setFillColor(GOLD)
    c.circle(width - 26 * mm, height - 16 * mm, 9 * mm, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width - 26 * mm, height - 18 * mm, "DEMO")

    photo_x, photo_y, photo_w, photo_h = 18 * mm, 39 * mm, 45 * mm, 58 * mm
    c.setFillColor(colors.HexColor("#DCE7ED"))
    c.roundRect(photo_x, photo_y, photo_w, photo_h, 3 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#8AA2B2"))
    c.circle(photo_x + photo_w / 2, photo_y + 39 * mm, 9 * mm, fill=1, stroke=0)
    c.roundRect(photo_x + 9 * mm, photo_y + 7 * mm, photo_w - 18 * mm, 24 * mm, 10 * mm, fill=1, stroke=0)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(photo_x + photo_w / 2, photo_y + 2 * mm, "SAMPLE PORTRAIT")

    x1, x2, x3 = 75 * mm, 145 * mm, 215 * mm
    y = height - 48 * mm
    label_value(c, x1, y, "Surname", "MEHTA")
    label_value(c, x2, y, "Given names", "AARAV")
    label_value(c, x3, y, "Nationality", "INDIAN")
    y -= 23 * mm
    label_value(c, x1, y, "Passport number", "DEMO-P1234567")
    label_value(c, x2, y, "Date of birth", "17 AUG 1994")
    label_value(c, x3, y, "Place of birth", "PUNE, INDIA")
    y -= 23 * mm
    label_value(c, x1, y, "Country of issue", "INDIA")
    label_value(c, x2, y, "Date of issue", "14 JUN 2022")
    label_value(c, x3, y, "Date of expiry", "13 JUN 2032")

    c.setFillColor(colors.HexColor("#E8E2D3"))
    c.roundRect(18 * mm, 20 * mm, width - 36 * mm, 15 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Courier-Bold", 10)
    c.drawString(23 * mm, 28 * mm, "P<INDMEHTA<<AARAV<<<<<<<<<<<<<<<<<<<<<<<<")
    c.drawString(23 * mm, 23 * mm, "DEMO1234567IND9408170M3206130<<<<<<<<<<<<")
    watermark(c, width, height)
    footer(c, width, "Fictional passport data for testing document extraction. All identifiers are synthetic.")
    c.save()
    return path


def degree_certificate():
    path = OUTPUT / "demo-degree-certificate-aarav-mehta.pdf"
    width, height = landscape(A4)
    c = canvas.Canvas(str(path), pagesize=(width, height), pageCompression=1)
    c.setTitle("Fictional Demo Degree Certificate - Aarav Mehta")
    c.setFillColor(colors.HexColor("#FCFBF7"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setStrokeColor(GOLD)
    c.setLineWidth(3)
    c.rect(12 * mm, 12 * mm, width - 24 * mm, height - 24 * mm, fill=0, stroke=1)
    c.setLineWidth(0.7)
    c.rect(16 * mm, 16 * mm, width - 32 * mm, height - 32 * mm, fill=0, stroke=1)
    c.setFillColor(TEAL)
    c.circle(width / 2, height - 34 * mm, 12 * mm, fill=0, stroke=1)
    c.setFont("Times-Bold", 11)
    c.drawCentredString(width / 2, height - 36 * mm, "KIT")
    c.setFillColor(INK)
    c.setFont("Times-Bold", 24)
    c.drawCentredString(width / 2, height - 55 * mm, "KONKAN INSTITUTE OF TECHNOLOGY")
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    c.drawCentredString(width / 2, height - 63 * mm, "FICTIONAL UNIVERSITY - PANVEL, MAHARASHTRA, INDIA")
    c.setFillColor(GOLD)
    c.setFont("Times-Italic", 18)
    c.drawCentredString(width / 2, height - 82 * mm, "Bachelor Degree Certificate")
    c.setFillColor(INK)
    c.setFont("Times-Roman", 13)
    c.drawCentredString(width / 2, height - 99 * mm, "This demonstration certificate records that")
    c.setFont("Times-Bold", 27)
    c.drawCentredString(width / 2, height - 116 * mm, "AARAV MEHTA")
    c.setFont("Times-Roman", 13)
    c.drawCentredString(width / 2, height - 131 * mm, "completed the requirements for the degree of")
    c.setFont("Times-Bold", 19)
    c.drawCentredString(width / 2, height - 145 * mm, "Bachelor of Technology in Computer Engineering")
    c.setFont("Times-Roman", 12)
    c.drawCentredString(width / 2, height - 158 * mm, "Degree awarded on 18 May 2016")

    c.setStrokeColor(INK)
    c.line(40 * mm, 40 * mm, 95 * mm, 40 * mm)
    c.line(width - 95 * mm, 40 * mm, width - 40 * mm, 40 * mm)
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawCentredString(67.5 * mm, 34 * mm, "Demo Registrar")
    c.drawCentredString(width - 67.5 * mm, 34 * mm, "Demo Chancellor")
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width / 2, 26 * mm, "CERTIFICATE NO. DEMO-KIT-2016-0421 - NOT A REAL QUALIFICATION")
    watermark(c, width, height)
    footer(c, width, "Fictional education record created only for the Adaptive Visitor Visa WebMCP demo.")
    c.save()
    return path


def utility_bill():
    path = OUTPUT / "demo-utility-bill-aarav-mehta.pdf"
    width, height = A4
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("Fictional Demo Utility Bill - Aarav Mehta")
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, height - 38 * mm, width, 38 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(18 * mm, height - 18 * mm, "PANVEL MUNICIPAL ENERGY - DEMO")
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, height - 25 * mm, "Fictional electricity statement for document-intake testing")
    c.setFont("Helvetica-Bold", 13)
    c.drawRightString(width - 18 * mm, height - 18 * mm, "MAY 2026")
    c.setFont("Helvetica", 8)
    c.drawRightString(width - 18 * mm, height - 25 * mm, "Statement # DEMO-0526-8841")

    c.setFillColor(LIGHT)
    c.roundRect(18 * mm, height - 92 * mm, width - 36 * mm, 42 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(24 * mm, height - 61 * mm, "SERVICE CUSTOMER")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(24 * mm, height - 70 * mm, "AARAV MEHTA")
    c.setFont("Helvetica", 10)
    address = [
        "116, Second Floor, Nara Apartments, Sector 6",
        "Panvel, Maharashtra 410206",
        "India",
    ]
    for index, line in enumerate(address):
        c.drawString(24 * mm, height - (78 + index * 6) * mm, line)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, height - 112 * mm, "ACCOUNT SUMMARY")
    rows = [
        ["Account number", "DEMO-PME-410206-116"],
        ["Billing period", "01 May 2026 - 31 May 2026"],
        ["Meter reading", "438.2 kWh"],
        ["Amount due", "INR 2,840.00"],
        ["Due date", "18 June 2026"],
        ["Contact phone", "+91 90000 00000"],
        ["Email", "aarav.mehta@example.test"],
    ]
    table = Table(rows, colWidths=[52 * mm, 112 * mm], rowHeights=10 * mm)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD7DF")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    table.wrapOn(c, width, height)
    table.drawOn(c, 18 * mm, height - 190 * mm)
    c.setFillColor(colors.HexColor("#FFF4E5"))
    c.roundRect(18 * mm, 42 * mm, width - 36 * mm, 25 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(24 * mm, 57 * mm, "DEMONSTRATION NOTICE")
    c.setFillColor(INK)
    c.setFont("Helvetica", 8)
    c.drawString(24 * mm, 50 * mm, "This statement, provider, account, meter reading, and contact data are entirely fictional.")
    watermark(c, width, height)
    footer(c, width, "Fictional proof-of-address sample. Do not use for identity, credit, or residency verification.")
    c.save()
    return path


def employment_letter():
    path = OUTPUT / "demo-employment-letter-aarav-mehta.pdf"
    width, height = A4
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("Fictional Demo Employment Letter - Aarav Mehta")
    c.setAuthor("Adaptive Visitor Visa WebMCP Demo")
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    c.setFillColor(INK)
    c.rect(0, height - 42 * mm, width, 42 * mm, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.roundRect(18 * mm, height - 31 * mm, 22 * mm, 22 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(29 * mm, height - 22 * mm, "ABC")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(47 * mm, height - 17 * mm, "ABC TECHNOLOGIES PRIVATE LIMITED")
    c.setFont("Helvetica", 7.5)
    c.drawString(47 * mm, height - 24 * mm, "8th Floor, Tata Towers, Plot C-26, Bandra Kurla Complex, Bandra East")
    c.drawString(47 * mm, height - 29 * mm, "Mumbai, Maharashtra 400051, India")
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(width - 18 * mm, height - 34 * mm, "HR & PEOPLE OPERATIONS")
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 7)
    c.drawRightString(width - 18 * mm, height - 39 * mm, "hr-verification@example.test  |  +91 22 0000 0000")

    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(18 * mm, height - 53 * mm, "REFERENCE")
    c.drawRightString(width - 18 * mm, height - 53 * mm, "DATE")
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.drawString(18 * mm, height - 59 * mm, "ABC/HR/DEMO/2026/0915")
    c.drawRightString(width - 18 * mm, height - 59 * mm, "15 September 2026")

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 73 * mm, "EMPLOYMENT & NO-OBJECTION LETTER")
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, height - 79 * mm, "FICTIONAL DEMONSTRATION DOCUMENT - NOT VALID FOR VERIFICATION")

    body_style = ParagraphStyle(
        "employment-body",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=INK,
    )
    intro = Paragraph(
        "To whom it may concern: This letter confirms that <b>Aarav Mehta</b> is employed by "
        "ABC Technologies Private Limited. The employment and compensation details below are "
        "synthetic and exist only to test document extraction in the Adaptive Visitor Visa WebMCP demo.",
        body_style,
    )
    intro.wrapOn(c, width - 36 * mm, 35 * mm)
    intro.drawOn(c, 18 * mm, height - 105 * mm)

    rows = [
        ["EMPLOYEE", "Aarav Mehta", "EMPLOYEE ID", "ABC-DEMO-0422"],
        ["JOB TITLE", "Software Engineer", "DEPARTMENT", "Product Engineering"],
        ["EMPLOYMENT", "Full-time, permanent", "START DATE", "22 April 2022"],
        ["MONTHLY GROSS", "INR 185,000", "ANNUAL GROSS", "INR 2,220,000"],
    ]
    table = Table(rows, colWidths=[31 * mm, 55 * mm, 31 * mm, 55 * mm], rowHeights=11 * mm)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("BACKGROUND", (2, 0), (2, -1), LIGHT),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD7DF")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ]))
    table.wrapOn(c, width, height)
    table.drawOn(c, 18 * mm, height - 157 * mm)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(18 * mm, height - 169 * mm, "PRIMARY WORKPLACE ADDRESS")
    c.setFillColor(LIGHT)
    c.roundRect(18 * mm, height - 190 * mm, width - 36 * mm, 15 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.drawString(24 * mm, height - 184 * mm, "8th Floor, Tata Towers, Plot C-26, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051, India")

    c.setFont("Helvetica-Bold", 8)
    c.drawString(18 * mm, height - 202 * mm, "EMPLOYEE FAMILY DETAILS RECORDED FOR THIS FICTIONAL DEMO")
    family = Table(
        [["FATHER'S FULL NAME", "Rajesh Mehta", "MOTHER'S FULL NAME", "Sunita Mehta"]],
        colWidths=[39 * mm, 47 * mm, 39 * mm, 47 * mm],
        rowHeights=12 * mm,
    )
    family.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#FFF4E5")),
        ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#FFF4E5")),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, 0), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, 0), "Helvetica"),
        ("FONTNAME", (3, 0), (3, 0), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9C894")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ]))
    family.wrapOn(c, width, height)
    family.drawOn(c, 18 * mm, height - 218 * mm)

    leave = Paragraph(
        "The company has no objection to the employee's fictional personal visit to the United States "
        "from <b>4 October 2026 through 10 October 2026</b>. Demonstration leave is recorded for those "
        "dates, and the employee is expected to resume duties on <b>12 October 2026</b>.",
        body_style,
    )
    leave.wrapOn(c, width - 36 * mm, 28 * mm)
    leave.drawOn(c, 18 * mm, height - 240 * mm)

    c.setStrokeColor(INK)
    c.line(18 * mm, 35 * mm, 73 * mm, 35 * mm)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(18 * mm, 29 * mm, "NEHA SHARMA - DEMO HR MANAGER")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(18 * mm, 24 * mm, "Digitally prepared for demonstration; no real signature is present.")
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(width - 18 * mm, 29 * mm, "NOT A REAL EMPLOYMENT RECORD")
    watermark(c, width, height, "FICTIONAL EMPLOYMENT LETTER - NOT VALID")
    footer(c, width, "Fictional employer, salary, family, workplace, and leave data for WebMCP extraction testing.")
    c.save()
    return path


def brother_invitation_letter():
    path = OUTPUT / "demo-brother-invitation-letter-aarav-mehta.pdf"
    width, height = A4
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("Fictional Demo Brother Invitation Letter - Aarav Mehta")
    c.setAuthor("Adaptive Visitor Visa WebMCP Demo")
    c.setFillColor(colors.HexColor("#FBFCFD"))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    c.setFillColor(colors.HexColor("#214E56"))
    c.rect(0, height - 43 * mm, width, 43 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(18 * mm, height - 17 * mm, "ROHAN MEHTA")
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, height - 24 * mm, "24 Maple Court, Apartment 7B, Long Island City, New York 11101, United States")
    c.drawString(18 * mm, height - 30 * mm, "rohan.mehta@example.test  |  +1 212 555 0148")
    c.setFillColor(GOLD)
    c.roundRect(width - 50 * mm, height - 31 * mm, 32 * mm, 18 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#214E56"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width - 34 * mm, height - 21 * mm, "FAMILY HOST")
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(width - 34 * mm, height - 26 * mm, "FICTIONAL DEMO")

    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(18 * mm, height - 55 * mm, "DATE")
    c.drawRightString(width - 18 * mm, height - 55 * mm, "REFERENCE")
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.drawString(18 * mm, height - 61 * mm, "16 September 2026")
    c.drawRightString(width - 18 * mm, height - 61 * mm, "RM/INVITE/DEMO-2026")

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 76 * mm, "INVITATION & STATEMENT OF INTENT")
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, height - 82 * mm, "FICTIONAL DEMONSTRATION LETTER - NOT VALID FOR IMMIGRATION USE")

    body_style = ParagraphStyle(
        "invitation-body",
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=INK,
    )
    greeting = Paragraph(
        "To whom it may concern: I, <b>Rohan Mehta</b>, am writing to invite my brother, "
        "<b>Aarav Mehta</b>, to visit me in New York City for a short family visit. We plan to "
        "spend time together and visit local attractions during his temporary stay.",
        body_style,
    )
    greeting.wrapOn(c, width - 36 * mm, 32 * mm)
    greeting.drawOn(c, 18 * mm, height - 108 * mm)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(18 * mm, height - 119 * mm, "VISIT PLAN")
    rows = [
        ["VISITOR", "Aarav Mehta", "RELATIONSHIP", "Brother"],
        ["PURPOSE", "Family visit and tourism", "DESTINATION", "New York City, USA"],
        ["ARRIVAL", "4 October 2026", "DEPARTURE", "10 October 2026"],
        ["STAY", "6 nights", "ACCOMMODATION", "Brother's residence"],
    ]
    table = Table(rows, colWidths=[28 * mm, 58 * mm, 34 * mm, 52 * mm], rowHeights=11 * mm)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#E8F1F2")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#E8F1F2")),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTNAME", (3, 0), (3, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BFD0D3")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ]))
    table.wrapOn(c, width, height)
    table.drawOn(c, 18 * mm, height - 169 * mm)

    c.setFont("Helvetica-Bold", 8)
    c.drawString(18 * mm, height - 181 * mm, "ADDRESS WHERE AARAV WILL STAY")
    c.setFillColor(colors.HexColor("#E8F1F2"))
    c.roundRect(18 * mm, height - 202 * mm, width - 36 * mm, 15 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.drawString(24 * mm, height - 196 * mm, "24 Maple Court, Apartment 7B, Long Island City, New York 11101, United States")

    funding = Paragraph(
        "<b>Accommodation and expenses.</b> Aarav will stay with me at the address above at no charge. "
        "He will pay for his round-trip airfare and personal expenses from his own employment income. "
        "I will provide the accommodation and may help with local meals and transportation while he is here.",
        body_style,
    )
    funding.wrapOn(c, width - 36 * mm, 32 * mm)
    funding.drawOn(c, 18 * mm, height - 227 * mm)

    intent = Paragraph(
        "<b>Temporary-visit intent.</b> This visit is limited to the dates shown above. Aarav has a "
        "return ticket for 10 October 2026 and expects to resume his employment in Mumbai on "
        "12 October 2026. He will not work or study during this fictional demonstration visit.",
        body_style,
    )
    intent.wrapOn(c, width - 36 * mm, 32 * mm)
    intent.drawOn(c, 18 * mm, height - 251 * mm)

    c.setStrokeColor(INK)
    c.line(18 * mm, 34 * mm, 73 * mm, 34 * mm)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(18 * mm, 28 * mm, "ROHAN MEHTA - FICTIONAL HOST & BROTHER")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(18 * mm, 23 * mm, "Available at the sample email and phone above for demo follow-up.")
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(width - 18 * mm, 28 * mm, "NOT A REAL INVITATION")
    watermark(c, width, height, "FICTIONAL BROTHER LETTER - NOT VALID")
    footer(c, width, "Fictional relationship, purpose, stay address, dates, funding, and host contact data for WebMCP testing.")
    c.save()
    return path


def bank_statement():
    path = OUTPUT / "demo-bank-statement-aarav-mehta.pdf"
    width, height = A4
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("Fictional Demo Bank Statement - Aarav Mehta")
    c.setAuthor("Adaptive Visitor Visa WebMCP Demo")
    c.setFillColor(colors.white)
    c.rect(0, 0, width, height, fill=1, stroke=0)

    bank_blue = colors.HexColor("#113A5C")
    mint = colors.HexColor("#DDF4EC")
    green = colors.HexColor("#147D64")
    pale_blue = colors.HexColor("#EAF2F8")

    c.setFillColor(bank_blue)
    c.rect(0, height - 43 * mm, width, 43 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(18 * mm, height - 17 * mm, "HARBORLINE BANK INDIA - DEMO")
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, height - 24 * mm, "Fictional retail banking statement created for document-intake testing")
    c.drawString(18 * mm, height - 30 * mm, "Demo Service Centre, Bandra Kurla Complex, Mumbai 400051, India")
    c.setFillColor(GOLD)
    c.roundRect(width - 56 * mm, height - 32 * mm, 38 * mm, 20 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(bank_blue)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width - 37 * mm, height - 21 * mm, "STATEMENT")
    c.setFont("Helvetica", 7)
    c.drawCentredString(width - 37 * mm, height - 27 * mm, "AUGUST 2026")

    c.setFillColor(colors.HexColor("#FFF1F0"))
    c.roundRect(18 * mm, height - 58 * mm, width - 36 * mm, 9 * mm, 2 * mm, fill=1, stroke=0)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2, height - 55 * mm, "FICTIONAL DEMONSTRATION STATEMENT - NOT ISSUED BY A REAL BANK")

    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(18 * mm, height - 68 * mm, "ACCOUNT HOLDER")
    c.drawString(112 * mm, height - 68 * mm, "STATEMENT DETAILS")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, height - 76 * mm, "AARAV MEHTA")
    c.setFont("Helvetica", 8.5)
    holder_lines = [
        "116, Second Floor, Nara Apartments, Sector 6",
        "Panvel, Maharashtra 410206, India",
        "aarav.mehta@example.test  |  +91 90000 00000",
    ]
    for index, line in enumerate(holder_lines):
        c.drawString(18 * mm, height - (83 + index * 5.5) * mm, line)

    details = [
        ("Account type", "Savings - salary account"),
        ("Account number", "XXXX XXXX 0019 (DEMO)"),
        ("Customer ID", "DEMO-AAM-1994"),
        ("Statement period", "01 Aug 2026 - 31 Aug 2026"),
        ("Statement issued", "01 Sep 2026"),
    ]
    for index, (label, value) in enumerate(details):
        y = height - (75 + index * 6) * mm
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(112 * mm, y, label.upper())
        c.setFillColor(INK)
        c.setFont("Helvetica", 8.5)
        c.drawRightString(width - 18 * mm, y, value)

    summary_y = height - 128 * mm
    c.setFillColor(bank_blue)
    c.roundRect(18 * mm, summary_y, width - 36 * mm, 25 * mm, 3 * mm, fill=1, stroke=0)
    summary = [
        ("OPENING BALANCE", "INR 1,145,600.00"),
        ("TOTAL CREDITS", "INR 188,120.00"),
        ("TOTAL DEBITS", "INR 176,950.00"),
        ("CLOSING / AVAILABLE", "INR 1,156,770.00"),
    ]
    col_width = (width - 36 * mm) / 4
    for index, (label, value) in enumerate(summary):
        x = 18 * mm + index * col_width
        if index:
            c.setStrokeColor(colors.HexColor("#6E879A"))
            c.line(x, summary_y + 5 * mm, x, summary_y + 20 * mm)
        c.setFillColor(colors.HexColor("#C9D8E3"))
        c.setFont("Helvetica-Bold", 6.5)
        c.drawCentredString(x + col_width / 2, summary_y + 16 * mm, label)
        c.setFillColor(colors.white if index < 3 else colors.HexColor("#9FF0D7"))
        c.setFont("Helvetica-Bold", 10 if index < 3 else 10.5)
        c.drawCentredString(x + col_width / 2, summary_y + 8 * mm, value)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(18 * mm, height - 135 * mm, "TRANSACTION ACTIVITY")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawRightString(width - 18 * mm, height - 135 * mm, "All amounts in Indian rupees (INR)")

    transactions = [
        ["01 Aug", "Opening balance", "-", "-", "1,145,600.00"],
        ["03 Aug", "Panvel Municipal Energy - DEMO-0526-8841", "2,840.00", "-", "1,142,760.00"],
        ["05 Aug", "Salary credit - ABC Technologies Pvt Ltd", "-", "185,000.00", "1,327,760.00"],
        ["07 Aug", "Monthly housing transfer", "42,000.00", "-", "1,285,760.00"],
        ["12 Aug", "Groceries and household purchases", "12,450.00", "-", "1,273,310.00"],
        ["18 Aug", "Northstar Air - DEMO6X2 round-trip ticket", "96,450.00", "-", "1,176,860.00"],
        ["22 Aug", "Demo travel insurance policy", "8,210.00", "-", "1,168,650.00"],
        ["25 Aug", "International travel card funding", "15,000.00", "-", "1,153,650.00"],
        ["31 Aug", "Monthly savings interest", "-", "3,120.00", "1,156,770.00"],
    ]
    tx_table = Table(
        [["DATE", "DESCRIPTION", "DEBIT", "CREDIT", "BALANCE"]] + transactions,
        colWidths=[19 * mm, 79 * mm, 25 * mm, 25 * mm, 30 * mm],
        rowHeights=[8 * mm] + [9 * mm] * len(transactions),
    )
    tx_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), bank_blue),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("BACKGROUND", (0, 2), (-1, 2), pale_blue),
        ("BACKGROUND", (0, 4), (-1, 4), pale_blue),
        ("BACKGROUND", (0, 6), (-1, 6), pale_blue),
        ("BACKGROUND", (0, 8), (-1, 8), pale_blue),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTNAME", (4, 1), (4, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, -1), 7.3),
        ("ALIGN", (2, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD7DF")),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    tx_table.wrapOn(c, width, height)
    tx_table.drawOn(c, 16 * mm, height - 230 * mm)

    c.setFillColor(mint)
    c.roundRect(18 * mm, 38 * mm, width - 36 * mm, 24 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(green)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(24 * mm, 52 * mm, "AVAILABLE FUNDS AT 31 AUGUST 2026: INR 1,156,770.00")
    c.setFillColor(INK)
    c.setFont("Helvetica", 7.5)
    c.drawString(24 * mm, 45 * mm, "The balance, employer credit, transactions, institution, identifiers, and customer data are entirely synthetic.")

    watermark(c, width, height, "FICTIONAL BANK STATEMENT - NOT VALID")
    footer(c, width, "Fictional proof-of-funds sample. Not valid for banking, credit, immigration, identity, or financial verification.")
    c.save()
    return path


def flight_ticket():
    path = OUTPUT / "demo-issued-flight-ticket-aarav-mehta.pdf"
    width, height = landscape(A4)
    c = canvas.Canvas(str(path), pagesize=(width, height), pageCompression=1)
    c.setTitle("Fictional Demo Issued Flight Ticket - Aarav Mehta")
    c.setFillColor(colors.HexColor("#F7FAFC"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.rect(0, height - 35 * mm, width, 35 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 19)
    c.drawString(18 * mm, height - 17 * mm, "NORTHSTAR AIR - DEMONSTRATION E-TICKET")
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, height - 24 * mm, "Issued itinerary receipt - fictional carrier and reservation")
    c.setFillColor(GOLD)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 18 * mm, height - 18 * mm, "STATUS: ISSUED (DEMO)")

    c.setFillColor(colors.white)
    c.roundRect(18 * mm, height - 79 * mm, width - 36 * mm, 32 * mm, 3 * mm, fill=1, stroke=0)
    label_value(c, 25 * mm, height - 58 * mm, "Passenger", "AARAV MEHTA", 55 * mm)
    label_value(c, 96 * mm, height - 58 * mm, "Booking reference", "DEMO6X2", 45 * mm)
    label_value(c, 157 * mm, height - 58 * mm, "Ticket number", "999-DEMO-1234567", 52 * mm)
    label_value(c, 226 * mm, height - 58 * mm, "Issued", "20 SEP 2026", 45 * mm)

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, height - 94 * mm, "OUTBOUND - SUNDAY, 04 OCTOBER 2026")
    outbound = [
        ["BOM", "Mumbai, India", "23:10", "NS 104 (Demo)", "JFK", "New York, USA", "08:40 +1 day"],
    ]
    table = Table(outbound, colWidths=[22 * mm, 42 * mm, 24 * mm, 38 * mm, 22 * mm, 42 * mm, 30 * mm], rowHeights=22 * mm)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#B7C7D4")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8E1E8")),
    ]))
    table.wrapOn(c, width, height)
    table.drawOn(c, 18 * mm, height - 124 * mm)

    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, height - 141 * mm, "RETURN - SATURDAY, 10 OCTOBER 2026")
    inbound = [["JFK", "New York, USA", "12:25", "NS 105 (Demo)", "BOM", "Mumbai, India", "10:55 +1 day"]]
    table2 = Table(inbound, colWidths=[22 * mm, 42 * mm, 24 * mm, 38 * mm, 22 * mm, 42 * mm, 30 * mm], rowHeights=22 * mm)
    table2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("TEXTCOLOR", (0, 0), (-1, -1), INK),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#B7C7D4")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D8E1E8")),
    ]))
    table2.wrapOn(c, width, height)
    table2.drawOn(c, 18 * mm, height - 171 * mm)

    c.setFillColor(colors.HexColor("#FFF4E5"))
    c.roundRect(18 * mm, 24 * mm, width - 36 * mm, 19 * mm, 3 * mm, fill=1, stroke=0)
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(24 * mm, 35 * mm, "NOT VALID FOR CHECK-IN OR TRAVEL")
    c.setFillColor(INK)
    c.setFont("Helvetica", 8)
    c.drawString(24 * mm, 29 * mm, "Northstar Air is fictional. Flights, ticket number, booking reference, and schedules are sample data.")
    watermark(c, width, height, "DEMO TICKET - NOT VALID FOR TRAVEL")
    footer(c, width, "Fictional issued itinerary for testing date, destination, passenger, and evidence extraction.")
    c.save()
    return path


if __name__ == "__main__":
    for generated in (passport(), degree_certificate(), utility_bill(), flight_ticket(), employment_letter(), brother_invitation_letter(), bank_statement()):
        copy2(generated, PUBLIC / generated.name)
        print(generated)
