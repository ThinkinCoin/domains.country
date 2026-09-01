from pathlib import Path

from PIL import Image, ImageDraw


source = Path("tmp/brand-svg-qa")
files = sorted(source.glob("*.png"))
cell_w, cell_h = 520, 340
sheet = Image.new("RGB", (cell_w * 4, cell_h * 4), "#DCE3E8")
draw = ImageDraw.Draw(sheet)

for index, file in enumerate(files):
    row, col = divmod(index, 4)
    x, y = col * cell_w, row * cell_h
    bg = "#07111D" if "negative" in file.name or "mono-white" in file.name else "#FFFFFF"
    draw.rectangle((x + 8, y + 8, x + cell_w - 8, y + cell_h - 8), fill=bg)
    image = Image.open(file).convert("RGBA")
    image.thumbnail((cell_w - 56, cell_h - 82), Image.Resampling.LANCZOS)
    px = x + (cell_w - image.width) // 2
    py = y + 28 + (cell_h - 72 - image.height) // 2
    panel = Image.new("RGBA", image.size, bg)
    panel.alpha_composite(image)
    sheet.paste(panel.convert("RGB"), (px, py))
    label_color = "#FFFFFF" if bg == "#07111D" else "#07111D"
    draw.text((x + 18, y + cell_h - 32), file.stem, fill=label_color)

out = source / "contact-sheet.png"
sheet.save(out, optimize=True)
print(out)
