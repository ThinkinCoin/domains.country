from __future__ import annotations

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from build_brand_pack import (
    BLUE, CYAN, MINT, ORANGE, NAVY, WHITE, INK, MUTED,
    FONT_REG, FONT_BOLD, FONT_SERIF, PDF_DIR, PNG_DIR,
    ensure_dirs, page_background, draw_image, wrapped,
)


OUT = PDF_DIR / "domains-country-brand-identity-guidelines-en.pdf"


def footer(c: canvas.Canvas, page: int, dark: bool = False) -> None:
    w, _ = landscape(A4)
    c.setFont("BrandSans", 8)
    c.setFillColor(HexColor("#B9C3CC" if dark else MUTED))
    c.drawString(36, 22, "domains.country - Brand identity guidelines")
    c.drawRightString(w - 36, 22, f"{page:02d}")


def title(c: canvas.Canvas, eyebrow: str, heading: str, subtitle: str = "") -> None:
    w, h = landscape(A4)
    c.setFillColor(HexColor(CYAN))
    c.setFont("BrandSansBold", 9)
    c.drawString(42, h - 52, eyebrow.upper())
    heading_size = 28
    while pdfmetrics.stringWidth(heading, "BrandSerif", heading_size) > w - 120 and heading_size > 20:
        heading_size -= 1
    c.setFillColor(HexColor(INK))
    c.setFont("BrandSerif", heading_size)
    c.drawString(42, h - 92, heading)
    if subtitle:
        c.setFillColor(HexColor(MUTED))
        c.setFont("BrandSans", 11)
        c.drawString(42, h - 114, subtitle)


def build() -> None:
    ensure_dirs()
    pdfmetrics.registerFont(TTFont("BrandSans", str(FONT_REG)))
    pdfmetrics.registerFont(TTFont("BrandSansBold", str(FONT_BOLD)))
    pdfmetrics.registerFont(TTFont("BrandSerif", str(FONT_SERIF)))
    c = canvas.Canvas(str(OUT), pagesize=landscape(A4), pageCompression=1)
    c.setTitle("domains.country Brand Identity Guidelines")
    c.setAuthor("domains.country")
    w, h = landscape(A4)

    # 1 - Cover
    page_background(c, NAVY)
    draw_image(c, PNG_DIR / "domains-country-icon-negative.png", 74, 185, 300, 300)
    c.setFillColor(HexColor(ORANGE))
    c.circle(91, 92, 8, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("BrandSansBold", 30)
    c.drawString(108, 80, "country")
    c.setFont("BrandSerif", 31)
    c.drawString(465, 330, "Brand identity")
    c.drawString(465, 292, "guidelines")
    c.setFont("BrandSans", 12)
    c.setFillColor(HexColor("#B7C5D1"))
    c.drawString(468, 248, "Brand system, usage rules, assets, and applications")
    c.setFont("BrandSansBold", 9)
    c.setFillColor(HexColor(MINT))
    c.drawString(468, 208, "VERSION 1.0 / 2026")
    footer(c, 1, True)
    c.showPage()

    # 2 - Essence
    page_background(c)
    title(c, "01 / Brand essence", "An identity for digital territory", "Clarity, global reach, and on-chain belonging.")
    c.setFont("BrandSerif", 26)
    c.setFillColor(HexColor(NAVY))
    c.drawString(55, 380, "Country. Presence. Ownership.")
    wrapped(c, "domains.country brings country-linked digital identities and domains into a trusted experience. The symbol combines an open C - access and territory - with a central point representing address, origin, and presence.", 55, 348, 340, 12, MUTED, 19)
    pillars = [
        ("CLARITY", "Few elements and immediate recognition."),
        ("CONNECTION", "A system connecting territory and digital identity."),
        ("TRUST", "Precise geometry with a modern institutional voice."),
    ]
    x = 455
    for label, body in pillars:
        c.setFillColor(HexColor("#F4F7F8"))
        c.roundRect(x, 255, 105, 145, 12, stroke=0, fill=1)
        c.setFillColor(HexColor(CYAN))
        c.circle(x + 24, 370, 7, stroke=0, fill=1)
        c.setFillColor(HexColor(INK))
        c.setFont("BrandSansBold", 10)
        c.drawString(x + 18, 338, label)
        wrapped(c, body, x + 18, 315, 72, 9, MUTED, 13)
        x += 120
    footer(c, 2)
    c.showPage()

    # 3 - Logo family
    page_background(c)
    title(c, "02 / Logo system", "Signature family", "Choose the version for the available space, not for isolated aesthetic preference.")
    for x, y, bw, bh in ((45, 135, 280, 325), (350, 305, 445, 155), (350, 135, 190, 145), (555, 135, 240, 145)):
        c.setFillColor(HexColor("#F5F8F9"))
        c.roundRect(x, y, bw, bh, 12, stroke=0, fill=1)
    draw_image(c, PNG_DIR / "domains-country-logo-primary-stacked.png", 82, 190, 205, 235)
    draw_image(c, PNG_DIR / "domains-country-logo-primary-horizontal.png", 382, 350, 380, 84)
    draw_image(c, PNG_DIR / "domains-country-icon-primary.png", 392, 165, 105, 105)
    draw_image(c, PNG_DIR / "domains-country-wordmark-primary.png", 580, 180, 190, 70)
    c.setFont("BrandSansBold", 9)
    c.setFillColor(HexColor(INK))
    c.drawString(66, 154, "PRIMARY / STACKED")
    c.drawString(372, 322, "HORIZONTAL")
    c.drawString(372, 151, "ICON")
    c.drawString(577, 151, "WORDMARK .COUNTRY")
    footer(c, 3)
    c.showPage()

    # 4 - Construction
    page_background(c)
    title(c, "03 / Construction", "Symbol structure", "The open C keeps the brand dynamic; the point always remains centered.")
    cx, cy = 280, 278
    c.setStrokeColor(HexColor("#D8E0E6"))
    c.setLineWidth(.7)
    for i in range(-3, 4):
        c.line(cx + i * 50, 80, cx + i * 50, 475)
        c.line(80, cy + i * 50, 480, cy + i * 50)
    draw_image(c, PNG_DIR / "domains-country-icon-primary.png", 100, 98, 360, 360)
    c.setStrokeColor(HexColor(ORANGE))
    c.setLineWidth(1.5)
    c.circle(cx, cy, 58, stroke=1, fill=0)
    c.line(cx - 210, cy, cx + 210, cy)
    c.line(cx, cy - 210, cx, cy + 210)
    c.setFont("BrandSansBold", 11)
    c.setFillColor(HexColor(INK))
    c.drawString(540, 400, "PROPORTIONS")
    metrics = [("1.00x", "outer diameter"), ("0.63x", "inner diameter"), ("0.32x", "point diameter"), ("36 deg", "half opening of the C")]
    y = 358
    for value, label in metrics:
        c.setFont("BrandSerif", 25)
        c.setFillColor(HexColor(CYAN))
        c.drawString(540, y, value)
        c.setFont("BrandSans", 10)
        c.setFillColor(HexColor(MUTED))
        c.drawString(635, y + 5, label)
        y -= 56
    wrapped(c, "Do not redraw, rotate, or move the point. Always build applications from the master files supplied in this pack.", 540, 155, 245, 10, MUTED, 15)
    footer(c, 4)
    c.showPage()

    # 5 - Clear space
    page_background(c)
    title(c, "04 / Clear space", "Clear space and minimum size", "The x unit equals the diameter of the orange point.")
    c.setFillColor(HexColor("#F5F8F9"))
    c.roundRect(50, 145, 420, 300, 14, stroke=0, fill=1)
    draw_image(c, PNG_DIR / "domains-country-logo-primary-horizontal.png", 90, 235, 340, 120)
    c.setStrokeColor(HexColor(ORANGE))
    c.setDash(4, 3)
    c.rect(76, 205, 370, 180, stroke=1, fill=0)
    c.setDash()
    c.setFont("BrandSansBold", 10)
    c.setFillColor(HexColor(ORANGE))
    c.drawString(78, 395, "x")
    c.drawString(452, 285, "x")
    c.setFillColor(HexColor(INK))
    c.drawString(530, 400, "MINIMUM SIZES")
    rows = [("Digital icon", "16 px"), ("Digital wordmark", "96 px wide"), ("Full signature", "160 px wide"), ("Print", "28 mm wide")]
    y = 350
    for label, value in rows:
        c.setStrokeColor(HexColor("#E3E8EC"))
        c.line(530, y - 10, 785, y - 10)
        c.setFont("BrandSans", 10)
        c.setFillColor(HexColor(MUTED))
        c.drawString(530, y + 7, label)
        c.setFont("BrandSansBold", 10)
        c.setFillColor(HexColor(INK))
        c.drawRightString(785, y + 7, value)
        y -= 52
    wrapped(c, "At very small favicon sizes, use the icon only. Do not use the wordmark below 96 px.", 530, 150, 255, 10, MUTED, 15)
    footer(c, 5)
    c.showPage()

    # 6 - Color
    page_background(c)
    title(c, "05 / Color", "Brand palette", "The gradient leads the system; orange marks location and action.")
    colors = [
        (BLUE, "HORIZON BLUE", "0 / 167 / 232"),
        (CYAN, "COUNTRY CYAN", "37 / 199 / 217"),
        (MINT, "OPEN MINT", "94 / 235 / 185"),
        (ORANGE, "ORIGIN ORANGE", "242 / 140 / 40"),
        (NAVY, "NIGHT NAVY", "7 / 17 / 29"),
    ]
    x = 45
    for hx, label, vals in colors:
        c.setFillColor(HexColor(hx))
        c.roundRect(x, 190, 142, 220, 12, stroke=0, fill=1)
        text_color = WHITE if hx in (NAVY, BLUE) else NAVY
        c.setFillColor(HexColor(text_color))
        c.setFont("BrandSansBold", 9)
        c.drawString(x + 14, 225, label)
        c.setFont("BrandSans", 8)
        c.drawString(x + 14, 208, hx)
        c.drawString(x + 14, 196, f"RGB {vals}")
        x += 150
    c.setFillColor(HexColor("#F6F8FA"))
    c.roundRect(45, 85, 742, 70, 10, stroke=0, fill=1)
    wrapped(c, "Official gradient: #00A7E8 -> #25C7D9 -> #5EEBB9, diagonally from bottom left to top right. Orange never enters the gradient; reserve it for the two points.", 62, 135, 705, 10, MUTED, 15)
    footer(c, 6)
    c.showPage()

    # 7 - Typography
    page_background(c)
    title(c, "06 / Typography", "A direct system with editorial contrast", "Inter drives the interface; Instrument Serif creates moments of voice and authority.")
    c.setFillColor(HexColor(NAVY))
    c.setFont("BrandSansBold", 42)
    c.drawString(50, 390, "Inter")
    c.setFont("BrandSans", 12)
    c.setFillColor(HexColor(MUTED))
    c.drawString(50, 360, "Interface, data, navigation, and functional copy")
    c.setFillColor(HexColor(INK))
    c.setFont("BrandSansBold", 19)
    c.drawString(50, 310, "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    c.setFont("BrandSans", 17)
    c.drawString(50, 278, "abcdefghijklmnopqrstuvwxyz 0123456789")
    c.setStrokeColor(HexColor("#E2E7EA"))
    c.line(420, 150, 420, 410)
    c.setFillColor(HexColor(NAVY))
    c.setFont("BrandSerif", 42)
    c.drawString(470, 390, "Instrument Serif")
    c.setFont("BrandSans", 12)
    c.setFillColor(HexColor(MUTED))
    c.drawString(470, 360, "Headlines, manifestos, and editorial communication")
    c.setFillColor(HexColor(INK))
    c.setFont("BrandSerif", 24)
    c.drawString(470, 300, "Your digital territory starts here.")
    wrapped(c, "Logo: a custom wordmark built on an extra-bold geometric sans-serif structure. Do not type or rebuild the signature; use the supplied files.", 470, 250, 300, 10, MUTED, 15)
    footer(c, 7)
    c.showPage()

    # 8 - Backgrounds
    page_background(c)
    title(c, "07 / Backgrounds", "Positive and negative versions", "Prioritize contrast and legibility. On photography, use visually quiet areas.")
    c.setFillColor(HexColor(NAVY))
    c.roundRect(45, 155, 365, 280, 14, stroke=0, fill=1)
    draw_image(c, PNG_DIR / "domains-country-logo-negative-stacked.png", 75, 168, 305, 255)
    c.setFillColor(HexColor("#F4F6F7"))
    c.roundRect(430, 155, 365, 280, 14, stroke=0, fill=1)
    draw_image(c, PNG_DIR / "domains-country-logo-primary-stacked.png", 460, 168, 305, 255)
    c.setFont("BrandSansBold", 9)
    c.setFillColor(HexColor(WHITE))
    c.drawString(62, 170, "NEGATIVE / NAVY BACKGROUND")
    c.setFillColor(HexColor(INK))
    c.drawString(447, 170, "PRIMARY / LIGHT BACKGROUND")
    footer(c, 8)
    c.showPage()

    # 9 - Misuse
    page_background(c)
    title(c, "08 / Integrity", "What not to do", "Consistency builds recognition.")
    items = [
        ("Do not change the gradient", "Avoid colors outside the palette."),
        ("Do not move the point", "It stays at the geometric center."),
        ("Do not distort", "Always preserve the proportions."),
        ("Do not add effects", "No shadows, glows, or outlines."),
        ("Do not rotate the symbol", "The opening always points right."),
        ("Do not reduce clear space", "Respect the x protection area."),
    ]
    positions = [(50, 350), (310, 350), (570, 350), (50, 185), (310, 185), (570, 185)]
    for (label, body), (x, y) in zip(items, positions):
        c.setFillColor(HexColor("#F6F8F9"))
        c.roundRect(x, y, 220, 125, 10, stroke=0, fill=1)
        c.setFillColor(HexColor(ORANGE))
        c.setFont("BrandSansBold", 15)
        c.drawString(x + 16, y + 88, "x")
        c.setFillColor(HexColor(INK))
        c.setFont("BrandSansBold", 10)
        c.drawString(x + 40, y + 90, label)
        wrapped(c, body, x + 16, y + 62, 185, 9, MUTED, 13)
    footer(c, 9)
    c.showPage()

    # 10 - Delivery
    page_background(c, NAVY)
    c.setFillColor(HexColor(MINT))
    c.setFont("BrandSansBold", 9)
    c.drawString(48, h - 52, "09 / DELIVERY")
    c.setFillColor(white)
    c.setFont("BrandSerif", 31)
    c.drawString(48, h - 92, "Files included with these guidelines")
    columns = [
        ("SVG", ["Stacked logo", "Horizontal logo", "Icon", ".country wordmark", "Primary, negative, and mono"]),
        ("PNG", ["Transparent backgrounds", "Negative variations", "Favicons 16-512 px", "Navy and white grounds", "High resolution"]),
        ("TOKENS", ["HEX and RGB colors", "Official gradient", "Typography", "Clear-space rules", "Usage README"]),
    ]
    x = 48
    for heading, lines in columns:
        c.setFillColor(HexColor("#102235"))
        c.roundRect(x, 160, 230, 280, 14, stroke=0, fill=1)
        c.setFillColor(HexColor(CYAN))
        c.setFont("BrandSansBold", 11)
        c.drawString(x + 18, 400, heading)
        y = 360
        for line in lines:
            c.setFillColor(HexColor(ORANGE))
            c.circle(x + 22, y + 3, 3, stroke=0, fill=1)
            c.setFillColor(white)
            c.setFont("BrandSans", 10)
            c.drawString(x + 35, y, line)
            y -= 40
        x += 250
    c.setFillColor(HexColor("#9FB0BE"))
    c.setFont("BrandSans", 9)
    c.drawString(48, 98, "Note: the gradient follows the Harmony color reference supplied by the client; review co-branding uses separately.")
    footer(c, 10, True)
    c.save()
    print(f"PDF={OUT}")


if __name__ == "__main__":
    build()
