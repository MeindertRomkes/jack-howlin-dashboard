import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

def create_facebook_cover_en():
    width = 1640
    height = 924

    # 1. Create a dark vintage canvas with warm amber vignette
    img = Image.new('RGB', (width, height), color=(10, 8, 7))

    # Add gradient / vignette
    grad = np.zeros((height, width, 3), dtype=np.float32)
    center_x, center_y = width // 2, height // 2
    for y in range(height):
        for x in range(width):
            dist = np.sqrt((x - center_x)**2 + (y - center_y)**2)
            max_dist = np.sqrt(center_x**2 + center_y**2)
            factor = max(0.0, 1.0 - (dist / max_dist) * 0.75)
            # Warm amber tint in center: (45, 30, 20) -> dark edges (12, 10, 9)
            r = 12 + factor * 35
            g = 10 + factor * 22
            b = 8 + factor * 14
            grad[y, x] = [r, g, b]

    bg_pil = Image.fromarray(grad.astype(np.uint8))
    img.paste(bg_pil, (0, 0))

    # 2. Composite Jack Howlin's official Core Set photo on the right side
    jack_src = cv2.imread('projects/jack-core-set/core_8_studio_halffiguur_zwart.jpg')
    h_j, w_j, _ = jack_src.shape
    aspect = w_j / h_j
    new_w = int(height * aspect * 0.95)
    jack_resized = cv2.resize(jack_src, (new_w, int(height * 0.95)), interpolation=cv2.INTER_LANCZOS4)

    # Soft alpha blend on the left edge of Jack
    jack_rgba = cv2.cvtColor(jack_resized, cv2.COLOR_BGR2RGBA)
    fade_w = 180
    for x in range(fade_w):
        alpha = int((x / float(fade_w)) * 255)
        jack_rgba[:, x, 3] = np.minimum(jack_rgba[:, x, 3], alpha)

    jack_pil = Image.fromarray(jack_rgba)
    jack_x = width - new_w - 30
    img.paste(jack_pil, (jack_x, int(height * 0.05)), mask=jack_pil.split()[3])

    # 3. Add Left & Center Typography & Branding in English
    draw = ImageDraw.Draw(img)

    try:
        font_eyebrow = ImageFont.truetype('arial.ttf', 24)
        font_title = ImageFont.truetype('georgia.ttf', 92)
        font_sub = ImageFont.truetype('georgia.ttf', 32)
        font_badge = ImageFont.truetype('arialbd.ttf', 24)
        font_stream = ImageFont.truetype('arial.ttf', 22)
        font_url = ImageFont.truetype('arialbd.ttf', 26)
    except:
        font_eyebrow = font_title = font_sub = font_badge = font_stream = font_url = ImageFont.load_default()

    # Outlaw gold colors
    c_gold = (212, 175, 55)
    c_warm_white = (245, 240, 230)
    c_amber = (230, 140, 50)
    c_muted = (160, 150, 140)

    # Eyebrow
    draw.text((120, 240), "OFFICIAL ARTIST PAGE", font=font_eyebrow, fill=c_amber)

    # Main Title
    draw.text((115, 280), "JACK HOWLIN'", font=font_title, fill=c_gold)

    # Subtitle / Genre
    draw.text((120, 395), "OUTLAW COUNTRY  •  DARK AMERICANA", font=font_sub, fill=c_warm_white)

    # Divider line
    draw.line([(120, 460), (700, 460)], fill=c_gold, width=3)

    # English Most Streamed Single badge
    draw.text((120, 500), "MOST STREAMED: \"HATE ME ALL YOU WANT\"", font=font_badge, fill=c_amber)
    draw.text((120, 540), "STREAM ON SPOTIFY  •  APPLE MUSIC  •  YOUTUBE", font=font_stream, fill=c_muted)

    # Website badge box
    box_x0, box_y0 = 120, 610
    box_x1, box_y1 = 490, 675
    draw.rectangle([box_x0, box_y0, box_x1, box_y1], fill=(25, 20, 18), outline=c_gold, width=2)
    draw.text((box_x0 + 25, box_y0 + 18), "WWW.JACKHOWLIN.COM", font=font_url, fill=c_gold)

    # Save final banner
    out_path = 'projects/hate-me-social-production/facebook_cover_banner_1640x924.jpg'
    img.save(out_path, quality=95)
    print(f"English Facebook cover banner saved to: {out_path}")

if __name__ == '__main__':
    create_facebook_cover_en()
