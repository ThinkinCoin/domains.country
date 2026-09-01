from __future__ import annotations

import json
import math
import os
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "output" / "brand" / "domains-country-identity-pack"
SVG_DIR = PACK / "svg"
PNG_DIR = PACK / "png"
PDF_DIR = PACK / "pdf"
SOURCE_DIR = PACK / "source"

NAVY = "#07111D"
BLUE = "#00A7E8"
CYAN = "#25C7D9"
MINT = "#5EEBB9"
ORANGE = "#F28C28"
IVORY = "#F1E9D6"
WHITE = "#FFFFFF"
INK = "#10141C"
MUTED = "#667380"

FONT_REG = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
FONT_SERIF = Path(r"C:\Windows\Fonts\georgia.ttf")


def ensure_dirs() -> None:
    for path in (SVG_DIR, PNG_DIR, PDF_DIR, SOURCE_DIR):
        path.mkdir(parents=True, exist_ok=True)


def gradient_def(gid: str = "brandGradient") -> str:
    return f'''<linearGradient id="{gid}" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="{BLUE}"/>
      <stop offset="52%" stop-color="{CYAN}"/>
      <stop offset="100%" stop-color="{MINT}"/>
    </linearGradient>'''


def c_stroke_path(cx: float, cy: float, ro: float, ri: float, gap_deg: float = 36) -> tuple[str, float]:
    """Return a non-self-intersecting long arc and its ring stroke width.

    Using one stroked centerline avoids the renderer-dependent winding behavior
    that deformed the previous compound outer/inner arc path.
    """
    radius = (ro + ri) / 2
    stroke_width = ro - ri
    start = math.radians(gap_deg)
    end = math.radians(-gap_deg)
    p1 = (cx + radius * math.cos(start), cy + radius * math.sin(start))
    p2 = (cx + radius * math.cos(end), cy + radius * math.sin(end))
    path = f"M {p1[0]:.2f},{p1[1]:.2f} A {radius:.2f},{radius:.2f} 0 1 1 {p2[0]:.2f},{p2[1]:.2f}"
    return path, stroke_width


def svg_header(w: int, h: int) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img">'


def svg_style(mode: str) -> tuple[str, str]:
    if mode == "primary":
        return "url(#brandGradient)", ORANGE
    if mode == "negative":
        return WHITE, ORANGE
    if mode == "mono-white":
        return WHITE, WHITE
    return NAVY, NAVY


def svg_icon(mode: str) -> str:
    main, accent = svg_style(mode)
    defs = gradient_def() if mode == "primary" else ""
    mark, mark_width = c_stroke_path(512, 512, 360, 225)
    return "\n".join([
        svg_header(1024, 1024),
        f"<defs>{defs}</defs>",
        f'<path d="{mark}" fill="none" stroke="{main}" stroke-width="{mark_width}" stroke-linecap="butt"/>',
        f'<circle cx="512" cy="512" r="116" fill="{accent}"/>',
        "</svg>",
    ])


def svg_wordmark(mode: str) -> str:
    main, accent = svg_style(mode)
    defs = gradient_def() if mode == "primary" else ""
    return "\n".join([
        svg_header(1600, 420),
        f"<defs>{defs}</defs>",
        '<g font-family="Inter, Arial, sans-serif" font-size="300" font-weight="800">',
        f'<circle cx="112" cy="291" r="43" fill="{accent}"/>',
        f'<text x="188" y="322" fill="{main}">country</text>',
        "</g>",
        "</svg>",
    ])


def svg_logo(mode: str, layout: str) -> str:
    main, accent = svg_style(mode)
    defs = gradient_def() if mode == "primary" else ""
    if layout == "stacked":
        w, h = 1200, 1200
        mark, mark_width = c_stroke_path(600, 430, 270, 170)
        dot = (600, 430, 87)
        text = (
            '<g font-family="Inter, Arial, sans-serif" font-size="190" font-weight="800">'
            f'<circle cx="230" cy="925" r="29" fill="{accent}"/>'
            f'<text x="285" y="970" fill="{main}">country</text></g>'
        )
    else:
        w, h = 2000, 620
        mark, mark_width = c_stroke_path(310, 310, 225, 142)
        dot = (310, 310, 72)
        text = (
            '<g font-family="Inter, Arial, sans-serif" font-size="275" font-weight="800">'
            f'<circle cx="635" cy="365" r="42" fill="{accent}"/>'
            f'<text x="710" y="432" fill="{main}">country</text></g>'
        )
    return "\n".join([
        svg_header(w, h),
        f"<defs>{defs}</defs>",
        f'<path d="{mark}" fill="none" stroke="{main}" stroke-width="{mark_width}" stroke-linecap="butt"/>',
        f'<circle cx="{dot[0]}" cy="{dot[1]}" r="{dot[2]}" fill="{accent}"/>',
        text,
        "</svg>",
    ])


def save_svgs() -> list[Path]:
    outputs: list[Path] = []
    for mode in ("primary", "negative", "mono-dark", "mono-white"):
        for name, content in (
            (f"domains-country-logo-{mode}-stacked.svg", svg_logo(mode, "stacked")),
            (f"domains-country-logo-{mode}-horizontal.svg", svg_logo(mode, "horizontal")),
            (f"domains-country-icon-{mode}.svg", svg_icon(mode)),
            (f"domains-country-wordmark-{mode}.svg", svg_wordmark(mode)),
        ):
            path = SVG_DIR / name
            path.write_text(content, encoding="utf-8")
            outputs.append(path)
    return outputs


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def gradient_rgba(size: tuple[int, int]) -> Image.Image:
    w, h = size
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    t = (x + (1 - y)) / 2
    stops = [(0.0, rgb(BLUE)), (0.52, rgb(CYAN)), (1.0, rgb(MINT))]
    out = np.zeros((h, w, 4), dtype=np.uint8)
    for idx in range(2):
        s0, c0 = stops[idx]
        s1, c1 = stops[idx + 1]
        weight = np.clip((t - s0) / (s1 - s0), 0, 1)[..., None]
        blend = np.array(c0) * (1 - weight) + np.array(c1) * weight
        active = (t >= s0) & (t <= s1)
        if idx == 0:
            active |= t < s0
        else:
            active |= t > s1
        out[..., :3][active] = blend[active].astype(np.uint8)
    out[..., 3] = 255
    return Image.fromarray(out, "RGBA")


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REG), size=size)


def paste_fill(canvas_img: Image.Image, mask: Image.Image, fill: str) -> None:
    if fill == "gradient":
        layer = gradient_rgba(canvas_img.size)
    else:
        layer = Image.new("RGBA", canvas_img.size, rgb(fill) + (255,))
    canvas_img.alpha_composite(Image.composite(layer, Image.new("RGBA", canvas_img.size), mask))


def c_mask(size: tuple[int, int], cx: int, cy: int, ro: int, ri: int, gap_deg: int = 36) -> Image.Image:
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((cx-ro, cy-ro, cx+ro, cy+ro), fill=255)
    d.ellipse((cx-ri, cy-ri, cx+ri, cy+ri), fill=0)
    tip_x = cx + ro + 10
    upper = (cx + int(ro * math.cos(math.radians(gap_deg))), cy - int(ro * math.sin(math.radians(gap_deg))))
    lower = (cx + int(ro * math.cos(math.radians(gap_deg))), cy + int(ro * math.sin(math.radians(gap_deg))))
    d.polygon([(cx, cy), upper, (tip_x, cy-ro), (tip_x, cy+ro), lower], fill=0)
    return mask


def draw_wordmark(img: Image.Image, y: int, max_width: int, mode: str, center_x: int | None = None, start_x: int | None = None, font_size: int = 250) -> None:
    f = font(font_size)
    word = "country"
    bbox = f.getbbox(word)
    word_w = bbox[2] - bbox[0]
    dot_r = max(18, int(font_size * 0.145))
    gap = int(font_size * 0.12)
    total = dot_r * 2 + gap + word_w
    x = start_x if start_x is not None else int((center_x or img.width // 2) - total / 2)
    accent = WHITE if mode == "mono-white" else (NAVY if mode == "mono-dark" else ORANGE)
    main = WHITE if mode in ("negative", "mono-white") else (NAVY if mode == "mono-dark" else "gradient")
    d = ImageDraw.Draw(img)
    dot_y = y + int(font_size * 0.69)
    d.ellipse((x, dot_y-dot_r, x+2*dot_r, dot_y+dot_r), fill=rgb(accent)+(255,))
    text_x = x + 2 * dot_r + gap
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).text((text_x, y), word, font=f, fill=255)
    paste_fill(img, mask, main)


def draw_mark(img: Image.Image, cx: int, cy: int, ro: int, ri: int, dot_r: int, mode: str) -> None:
    main = WHITE if mode in ("negative", "mono-white") else (NAVY if mode == "mono-dark" else "gradient")
    accent = WHITE if mode == "mono-white" else (NAVY if mode == "mono-dark" else ORANGE)
    paste_fill(img, c_mask(img.size, cx, cy, ro, ri), main)
    ImageDraw.Draw(img).ellipse((cx-dot_r, cy-dot_r, cx+dot_r, cy+dot_r), fill=rgb(accent)+(255,))


def save_png_logo(mode: str, layout: str) -> Path:
    if layout == "stacked":
        size = (1600, 1600)
        img = Image.new("RGBA", size, (0, 0, 0, 0))
        draw_mark(img, 800, 560, 360, 226, 116, mode)
        draw_wordmark(img, 1120, 1380, mode, center_x=800, font_size=235)
    else:
        size = (2400, 760)
        img = Image.new("RGBA", size, (0, 0, 0, 0))
        draw_mark(img, 380, 380, 280, 176, 90, mode)
        draw_wordmark(img, 190, 1700, mode, start_x=760, font_size=310)
    path = PNG_DIR / f"domains-country-logo-{mode}-{layout}.png"
    img.save(path, optimize=True)
    return path


def save_png_icon(mode: str, size: int = 1024, suffix: str = "") -> Path:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_mark(img, size // 2, size // 2, int(size * .36), int(size * .225), int(size * .116), mode)
    path = PNG_DIR / f"domains-country-icon-{mode}{suffix}.png"
    img.save(path, optimize=True)
    return path


def save_png_wordmark(mode: str) -> Path:
    img = Image.new("RGBA", (1800, 450), (0, 0, 0, 0))
    draw_wordmark(img, 45, 1700, mode, center_x=900, font_size=330)
    path = PNG_DIR / f"domains-country-wordmark-{mode}.png"
    img.save(path, optimize=True)
    return path


def save_pngs() -> list[Path]:
    outputs: list[Path] = []
    for mode in ("primary", "negative", "mono-dark", "mono-white"):
        outputs.extend([
            save_png_logo(mode, "stacked"),
            save_png_logo(mode, "horizontal"),
            save_png_icon(mode),
            save_png_wordmark(mode),
        ])

    # Favicons and touch icons.
    base = Image.open(PNG_DIR / "domains-country-icon-primary.png")
    for size in (16, 32, 180, 192, 512):
        icon = base.resize((size, size), Image.Resampling.LANCZOS)
        path = PNG_DIR / f"domains-country-icon-{size}x{size}.png"
        icon.save(path, optimize=True)
        outputs.append(path)

    # Brand-controlled background previews.
    for name, background, source in (
        ("domains-country-logo-primary-on-white.png", WHITE, "domains-country-logo-primary-horizontal.png"),
        ("domains-country-logo-negative-on-navy.png", NAVY, "domains-country-logo-negative-horizontal.png"),
    ):
        fg = Image.open(PNG_DIR / source)
        bg = Image.new("RGBA", fg.size, rgb(background) + (255,))
        bg.alpha_composite(fg)
        path = PNG_DIR / name
        bg.convert("RGB").save(path, quality=95)
        outputs.append(path)
    return outputs


def page_background(c: canvas.Canvas, color: str = WHITE) -> None:
    w, h = landscape(A4)
    c.setFillColor(HexColor(color))
    c.rect(0, 0, w, h, stroke=0, fill=1)


def footer(c: canvas.Canvas, page: int, dark: bool = False) -> None:
    w, _ = landscape(A4)
    c.setFont("BrandSans", 8)
    c.setFillColor(HexColor("#B9C3CC" if dark else MUTED))
    c.drawString(36, 22, "domains.country - Manual de identidade visual")
    c.drawRightString(w - 36, 22, f"{page:02d}")


def title(c: canvas.Canvas, eyebrow: str, heading: str, subtitle: str = "") -> None:
    w, h = landscape(A4)
    c.setFillColor(HexColor(CYAN))
    c.setFont("BrandSansBold", 9)
    c.drawString(42, h - 52, eyebrow.upper())
    c.setFillColor(HexColor(INK))
    heading_size = 28
    while pdfmetrics.stringWidth(heading, "BrandSerif", heading_size) > w - 120 and heading_size > 20:
        heading_size -= 1
    c.setFont("BrandSerif", heading_size)
    c.drawString(42, h - 92, heading)
    if subtitle:
        c.setFillColor(HexColor(MUTED))
        c.setFont("BrandSans", 11)
        c.drawString(42, h - 114, subtitle)


def draw_image(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float) -> None:
    c.drawImage(ImageReader(str(path)), x, y, width=w, height=h, preserveAspectRatio=True, mask="auto", anchor="c")


def wrapped(c: canvas.Canvas, text: str, x: float, y: float, width: float, size: int = 10, color: str = MUTED, leading: int | None = None, align: int = TA_LEFT) -> None:
    style = ParagraphStyle(
        "manual",
        fontName="BrandSans",
        fontSize=size,
        leading=leading or int(size * 1.45),
        textColor=HexColor(color),
        alignment=align,
    )
    p = Paragraph(text, style)
    _, ph = p.wrap(width, 200)
    p.drawOn(c, x, y - ph)


def brand_manual() -> Path:
    pdfmetrics.registerFont(TTFont("BrandSans", str(FONT_REG)))
    pdfmetrics.registerFont(TTFont("BrandSansBold", str(FONT_BOLD)))
    pdfmetrics.registerFont(TTFont("BrandSerif", str(FONT_SERIF)))
    out = PDF_DIR / "domains-country-manual-identidade-visual.pdf"
    c = canvas.Canvas(str(out), pagesize=landscape(A4), pageCompression=1)
    w, h = landscape(A4)

    # 1 - Cover
    page_background(c, NAVY)
    draw_image(c, PNG_DIR / "domains-country-icon-negative.png", 74, 185, 300, 300)
    c.setFillColor(HexColor(ORANGE))
    c.circle(91, 92, 8, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("BrandSansBold", 30)
    c.drawString(108, 80, "country")
    c.setFillColor(white)
    c.setFont("BrandSerif", 31)
    c.drawString(465, 330, "Manual de")
    c.drawString(465, 292, "identidade visual")
    c.setFont("BrandSans", 12)
    c.setFillColor(HexColor("#B7C5D1"))
    c.drawString(468, 248, "Sistema de marca, usos, arquivos e aplicações")
    c.setFont("BrandSansBold", 9)
    c.setFillColor(HexColor(MINT))
    c.drawString(468, 208, "VERSÃO 1.0 / 2026")
    footer(c, 1, True)
    c.showPage()

    # 2 - Essence
    page_background(c)
    title(c, "01 / Essência", "Uma identidade para território digital", "Clareza, alcance global e pertencimento on-chain.")
    c.setFont("BrandSerif", 26)
    c.setFillColor(HexColor(NAVY))
    c.drawString(55, 380, "País. Presença. Propriedade.")
    wrapped(c, "domains.country organiza identidades digitais ligadas a países e domínios em uma experiência confiável. O símbolo combina um C aberto - acesso e território - com um ponto central que representa endereço, origem e presença.", 55, 348, 340, 12, MUTED, 19)
    pillars = [("CLAREZA", "Poucos elementos, leitura imediata."), ("CONEXÃO", "Um sistema que aproxima território e identidade digital."), ("CONFIANÇA", "Geometria precisa e linguagem institucional contemporânea.")]
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

    # 3 - Logo system
    page_background(c)
    title(c, "02 / Sistema", "Família de assinaturas", "Escolha a versão pela área disponível, nunca por preferência estética isolada.")
    for x, y, bw, bh in ((45, 135, 280, 325), (350, 305, 445, 155), (350, 135, 190, 145), (555, 135, 240, 145)):
        c.setFillColor(HexColor("#F5F8F9"))
        c.roundRect(x, y, bw, bh, 12, stroke=0, fill=1)
    draw_image(c, PNG_DIR / "domains-country-logo-primary-stacked.png", 82, 190, 205, 235)
    draw_image(c, PNG_DIR / "domains-country-logo-primary-horizontal.png", 382, 350, 380, 84)
    draw_image(c, PNG_DIR / "domains-country-icon-primary.png", 392, 165, 105, 105)
    draw_image(c, PNG_DIR / "domains-country-wordmark-primary.png", 580, 180, 190, 70)
    c.setFont("BrandSansBold", 9)
    c.setFillColor(HexColor(INK))
    c.drawString(66, 154, "PRINCIPAL / EMPILHADA")
    c.drawString(372, 322, "HORIZONTAL")
    c.drawString(372, 151, "ÍCONE")
    c.drawString(577, 151, "WORDMARK .COUNTRY")
    footer(c, 3)
    c.showPage()

    # 4 - Construction
    page_background(c)
    title(c, "03 / Construção", "Estrutura do símbolo", "A abertura do C mantém a marca dinâmica; o ponto é sempre centralizado.")
    cx, cy, ro, ri = 280, 278, 175, 110
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
    c.drawString(540, 400, "PROPORÇÕES")
    metrics = [("1.00x", "diâmetro externo"), ("0.63x", "diâmetro interno"), ("0.32x", "diâmetro do ponto"), ("36°", "meia abertura do C")]
    y = 358
    for value, label in metrics:
        c.setFont("BrandSerif", 25)
        c.setFillColor(HexColor(CYAN))
        c.drawString(540, y, value)
        c.setFont("BrandSans", 10)
        c.setFillColor(HexColor(MUTED))
        c.drawString(620, y + 5, label)
        y -= 56
    wrapped(c, "Não redesenhar, girar ou deslocar o ponto. A construção deve partir sempre dos arquivos-mestre fornecidos neste pack.", 540, 155, 245, 10, MUTED, 15)
    footer(c, 4)
    c.showPage()

    # 5 - Protection
    page_background(c)
    title(c, "04 / Respiro", "Área de proteção e tamanho mínimo", "A unidade x corresponde ao diâmetro do ponto laranja.")
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
    c.drawString(530, 400, "TAMANHOS MÍNIMOS")
    rows = [("Ícone digital", "16 px"), ("Wordmark digital", "96 px de largura"), ("Assinatura completa", "160 px de largura"), ("Impressão", "28 mm de largura")]
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
    wrapped(c, "Em favicons muito pequenos, use apenas o ícone. Não use o wordmark abaixo de 96 px.", 530, 150, 255, 10, MUTED, 15)
    footer(c, 5)
    c.showPage()

    # 6 - Color
    page_background(c)
    title(c, "05 / Cor", "Paleta da marca", "O gradiente é protagonista; o laranja funciona como ponto de localização e ação.")
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
    wrapped(c, "Gradiente oficial: #00A7E8 → #25C7D9 → #5EEBB9, em diagonal do canto inferior esquerdo para o superior direito. O laranja nunca participa do gradiente; ele é reservado aos pontos.", 62, 135, 705, 10, MUTED, 15)
    footer(c, 6)
    c.showPage()

    # 7 - Typography
    page_background(c)
    title(c, "06 / Tipografia", "Um sistema direto com contraste editorial", "Inter conduz a interface; Instrument Serif cria momentos de voz e autoridade.")
    c.setFillColor(HexColor(NAVY))
    c.setFont("BrandSansBold", 42)
    c.drawString(50, 390, "Inter")
    c.setFont("BrandSans", 12)
    c.setFillColor(HexColor(MUTED))
    c.drawString(50, 360, "Interface, dados, navegação e textos funcionais")
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
    c.drawString(470, 360, "Títulos, manifesto e comunicação editorial")
    c.setFillColor(HexColor(INK))
    c.setFont("BrandSerif", 24)
    c.drawString(470, 300, "Seu território digital começa aqui.")
    wrapped(c, "Logo: wordmark customizado sobre estrutura geométrica de sans-serif extrabold. Não digite ou remonte a assinatura; use os arquivos fornecidos.", 470, 250, 300, 10, MUTED, 15)
    footer(c, 7)
    c.showPage()

    # 8 - Negative
    page_background(c)
    title(c, "07 / Fundos", "Versões positivas e negativas", "Priorize contraste e leitura. Em fotografia, use áreas visualmente calmas.")
    c.setFillColor(HexColor(NAVY))
    c.roundRect(45, 155, 365, 280, 14, stroke=0, fill=1)
    draw_image(c, PNG_DIR / "domains-country-logo-negative-stacked.png", 75, 168, 305, 255)
    c.setFillColor(HexColor("#F4F6F7"))
    c.roundRect(430, 155, 365, 280, 14, stroke=0, fill=1)
    draw_image(c, PNG_DIR / "domains-country-logo-primary-stacked.png", 460, 168, 305, 255)
    c.setFont("BrandSansBold", 9)
    c.setFillColor(HexColor(WHITE))
    c.drawString(62, 170, "NEGATIVO / FUNDO NAVY")
    c.setFillColor(HexColor(INK))
    c.drawString(447, 170, "PRINCIPAL / FUNDO CLARO")
    footer(c, 8)
    c.showPage()

    # 9 - Misuse
    page_background(c)
    title(c, "08 / Integridade", "O que não fazer", "Consistência constrói reconhecimento.")
    items = [
        ("Não alterar o gradiente", "Evite cores fora da paleta."),
        ("Não mover o ponto", "Ele permanece no centro geométrico."),
        ("Não distorcer", "Mantenha sempre as proporções."),
        ("Não aplicar efeitos", "Sem sombras, brilhos ou contornos."),
        ("Não girar o símbolo", "A abertura aponta para a direita."),
        ("Não reduzir o respiro", "Respeite a área de proteção x."),
    ]
    positions = [(50, 350), (310, 350), (570, 350), (50, 185), (310, 185), (570, 185)]
    for (label, body), (x, y) in zip(items, positions):
        c.setFillColor(HexColor("#F6F8F9"))
        c.roundRect(x, y, 220, 125, 10, stroke=0, fill=1)
        c.setFillColor(HexColor(ORANGE))
        c.setFont("BrandSansBold", 15)
        c.drawString(x + 16, y + 88, "×")
        c.setFillColor(HexColor(INK))
        c.setFont("BrandSansBold", 10)
        c.drawString(x + 40, y + 90, label)
        wrapped(c, body, x + 16, y + 62, 185, 9, MUTED, 13)
    footer(c, 9)
    c.showPage()

    # 10 - Files
    page_background(c, NAVY)
    c.setFillColor(HexColor(MINT))
    c.setFont("BrandSansBold", 9)
    c.drawString(48, h - 52, "09 / ENTREGA")
    c.setFillColor(white)
    c.setFont("BrandSerif", 31)
    c.drawString(48, h - 92, "Arquivos que acompanham este manual")
    columns = [
        ("SVG", ["Logo empilhada", "Logo horizontal", "Ícone", "Wordmark .country", "Positivo, negativo e mono"]),
        ("PNG", ["Fundos transparentes", "Variações negativas", "Favicons 16-512 px", "Fundos navy e branco", "Alta resolução"]),
        ("TOKENS", ["Cores em HEX/RGB", "Gradiente oficial", "Tipografia", "Regras de respiro", "README de uso"]),
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
    c.drawString(48, 98, "Observação: o gradiente usa a referência cromática Harmony fornecida pelo cliente; valide usos de co-branding separadamente.")
    footer(c, 10, True)
    c.save()
    return out


def write_support_files() -> None:
    tokens = {
        "brand": "domains.country",
        "version": "1.0",
        "colors": {
            "horizonBlue": BLUE,
            "countryCyan": CYAN,
            "openMint": MINT,
            "originOrange": ORANGE,
            "nightNavy": NAVY,
            "ivory": IVORY,
        },
        "gradient": {
            "css": f"linear-gradient(45deg, {BLUE} 0%, {CYAN} 52%, {MINT} 100%)",
            "direction": "bottom-left to top-right",
        },
        "typography": {
            "ui": "Inter",
            "editorial": "Instrument Serif",
            "logo": "Custom geometric extra-bold wordmark",
        },
        "clearSpace": "1x, where x is the orange dot diameter",
        "minimumSize": {
            "iconDigital": "16px",
            "wordmarkDigital": "96px width",
            "fullSignatureDigital": "160px width",
            "print": "28mm width",
        },
    }
    (PACK / "brand-tokens.json").write_text(json.dumps(tokens, ensure_ascii=False, indent=2), encoding="utf-8")
    readme = f"""# domains.country - Identity Pack

## Contents

- `pdf/`: brand identity manual.
- `svg/`: editable vector masters.
- `png/`: high-resolution transparent assets, negative variants, previews, and favicons.
- `source/`: approved AI concept reference used to derive the production asset family.
- `brand-tokens.json`: palette, typography, gradient, and minimum-size rules.

## Default use

- Light background: `domains-country-logo-primary-horizontal`.
- Dark background: `domains-country-logo-negative-horizontal`.
- Small UI surface or favicon: `domains-country-icon-primary`.
- Text-only placement: `domains-country-wordmark-primary`.

## Brand rules

- Keep the orange point centered in the C.
- Keep the leading period in `.country` orange.
- Apply the brand gradient only to the C and `country` letters.
- Reserve clear space equal to one orange-dot diameter.
- Never stretch, rotate, outline, or add effects to the logo.

## Core colors

- Horizon Blue `{BLUE}`
- Country Cyan `{CYAN}`
- Open Mint `{MINT}`
- Origin Orange `{ORANGE}`
- Night Navy `{NAVY}`
"""
    (PACK / "README.md").write_text(readme, encoding="utf-8")


def copy_reference() -> None:
    source = Path(r"C:\Users\mzfsh\.codex\generated_images\01a059a5-b9c9-7a70-ba47-eb56a0ac5dfe\exec-c2bb957b-aeb6-4de5-b98f-b44ffb146954.png")
    if source.exists():
        shutil.copy2(source, SOURCE_DIR / "approved-concept-reference.png")


def main() -> None:
    ensure_dirs()
    save_svgs()
    save_pngs()
    write_support_files()
    copy_reference()
    pdf = brand_manual()
    print(f"PACK={PACK}")
    print(f"PDF={pdf}")
    print(f"SVG_COUNT={len(list(SVG_DIR.glob('*.svg')))}")
    print(f"PNG_COUNT={len(list(PNG_DIR.glob('*.png')))}")


if __name__ == "__main__":
    main()
