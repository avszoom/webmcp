from pathlib import Path

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
    c.setFont("Helvetica-Bold", 17)
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
    for generated in (passport(), degree_certificate(), utility_bill(), flight_ticket()):
        print(generated)
