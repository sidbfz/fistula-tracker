from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw-screenshots"
OUTPUT = ROOT / "play-store-screenshots"

WIDTH = 1080
HEIGHT = 1920

SERIF = Path(
    "node_modules/@expo-google-fonts/instrument-serif/400Regular/"
    "InstrumentSerif_400Regular.ttf"
)
SERIF_ITALIC = Path(
    "node_modules/@expo-google-fonts/instrument-serif/400Regular_Italic/"
    "InstrumentSerif_400Regular_Italic.ttf"
)
SANS_BOLD = Path(
    "node_modules/@expo-google-fonts/darker-grotesque/700Bold/"
    "DarkerGrotesque_700Bold.ttf"
)


def vertical_gradient(size: tuple[int, int], top: str, bottom: str) -> Image.Image:
    width, height = size
    top_rgb = tuple(bytes.fromhex(top.lstrip("#")))
    bottom_rgb = tuple(bytes.fromhex(bottom.lstrip("#")))
    image = Image.new("RGB", size)
    pixels = image.load()
    for y in range(height):
        ratio = y / max(height - 1, 1)
        color = tuple(
            round(top_rgb[channel] * (1 - ratio) + bottom_rgb[channel] * ratio)
            for channel in range(3)
        )
        for x in range(width):
            pixels[x, y] = color
    return image


def centered_text(
    canvas: Image.Image,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont,
    fill: str,
) -> int:
    draw = ImageDraw.Draw(canvas)
    bounds = draw.textbbox((0, 0), text, font=font)
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    draw.text(((WIDTH - text_width) / 2, y - bounds[1]), text, font=font, fill=fill)
    return y + text_height


def rounded_image(image: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, image.width - 1, image.height - 1), radius=radius, fill=255
    )
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.paste(image.convert("RGBA"), (0, 0), mask)
    return result


def create_panel(source_name: str, output_name: str, first_line: str, second_line: str) -> Path:
    canvas = vertical_gradient((WIDTH, HEIGHT), "#B9827D", "#D7A7A0")

    regular = ImageFont.truetype(str(SERIF), 96)
    italic = ImageFont.truetype(str(SERIF_ITALIC), 96)
    line_end = centered_text(canvas, first_line, 88, regular, "#FFF8F1")
    centered_text(canvas, second_line, line_end + 8, italic, "#FFF8F1")

    source = Image.open(RAW / source_name).convert("RGB")
    screen_width = 790
    screen_height = round(source.height * screen_width / source.width)
    screen = source.resize((screen_width, screen_height), Image.Resampling.LANCZOS)

    frame_padding = 16
    frame_width = screen_width + frame_padding * 2
    frame_height = screen_height + frame_padding * 2
    frame_x = (WIDTH - frame_width) // 2
    frame_y = 390

    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (frame_x - 5, frame_y + 18, frame_x + frame_width + 5, frame_y + frame_height + 28),
        radius=58,
        fill=(50, 31, 28, 105),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)

    frame = Image.new("RGBA", (frame_width, frame_height), "#201D1A")
    frame_mask = Image.new("L", frame.size, 0)
    ImageDraw.Draw(frame_mask).rounded_rectangle(
        (0, 0, frame_width - 1, frame_height - 1), radius=56, fill=255
    )
    clipped_frame = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    clipped_frame.paste(frame, (0, 0), frame_mask)
    clipped_screen = rounded_image(screen, radius=42)
    clipped_frame.alpha_composite(clipped_screen, (frame_padding, frame_padding))
    canvas.alpha_composite(clipped_frame, (frame_x, frame_y))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT / output_name
    canvas.convert("RGB").save(output_path, "PNG", optimize=True)
    return output_path


def create_feature_graphic() -> Path:
    width, height = 1024, 500
    canvas = vertical_gradient((width, height), "#B9827D", "#D7A7A0").convert("RGBA")

    # A quiet cream field gives the detailed mark enough separation without
    # turning the banner into an enlarged launcher icon.
    accent = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent)
    accent_draw.ellipse((38, 72, 382, 416), fill=(244, 241, 235, 68))
    accent_draw.ellipse((78, 112, 342, 376), outline=(255, 248, 241, 85), width=2)
    canvas = Image.alpha_composite(canvas, accent)

    logo = Image.open("assets/images/splash-icon.png").convert("RGBA")
    logo = logo.crop(logo.getbbox())
    logo.thumbnail((320, 340), Image.Resampling.LANCZOS)

    logo_shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_alpha = logo.getchannel("A").filter(ImageFilter.GaussianBlur(14))
    shadow_layer = Image.new("RGBA", logo.size, (50, 31, 28, 75))
    shadow_layer.putalpha(shadow_alpha.point(lambda value: round(value * 0.30)))
    logo_x = 50 + (320 - logo.width) // 2
    # The full splash mark has long strings below the donut, so its geometric
    # centre sits above its visual centre. Lower it to align the donut with the
    # circular field behind it.
    logo_y = (height - logo.height) // 2 + 28
    logo_shadow.alpha_composite(shadow_layer, (logo_x + 4, logo_y + 12))
    canvas = Image.alpha_composite(canvas, logo_shadow)
    canvas.alpha_composite(logo, (logo_x, logo_y))

    draw = ImageDraw.Draw(canvas)
    label_font = ImageFont.truetype(str(SANS_BOLD), 27)
    title_font = ImageFont.truetype(str(SERIF), 65)
    italic_font = ImageFont.truetype(str(SERIF_ITALIC), 69)

    text_x = 432
    draw.text((text_x, 116), "FISTULA TRACKER", font=label_font, fill="#F8EDE7")
    draw.text((text_x, 166), "A private space for", font=title_font, fill="#FFF8F1")
    draw.text((text_x, 235), "fistula recovery", font=italic_font, fill="#FFF8F1")

    # Restrained rule echoes the app's progress and timeline motifs.
    draw.rounded_rectangle((text_x, 343, 707, 348), radius=3, fill="#FFF8F1")
    draw.ellipse((724, 338, 734, 348), fill="#FFF8F1")
    draw.ellipse((750, 338, 760, 348), fill=(255, 248, 241, 155))

    output_path = ROOT / "feature-graphic.png"
    canvas.convert("RGB").save(output_path, "PNG", optimize=True)
    return output_path


if __name__ == "__main__":
    panels = [
        ("01-home.png", "01-home-play-store.png", "Your recovery,", "at a glance"),
        ("02-daily-check-in.png", "02-check-in-play-store.png", "Check in with", "your day"),
        ("03-medicines.png", "03-medicines-play-store.png", "Medicines,", "gently organized"),
        ("04-recovery-timeline.png", "04-timeline-play-store.png", "Notice change", "over time"),
        ("05-journal.png", "05-journal-play-store.png", "A private place", "to reflect"),
        ("06-private-photos.png", "06-private-photos-play-store.png", "Photos kept", "discreet"),
    ]
    for panel in panels:
        print(create_panel(*panel))
    print(create_feature_graphic())
