#!/usr/bin/env python3
"""
Jack Howlin Merch Social Pack Generator
Automates the creation of 4:5 Feed Portrait, 1:1 Square, and 9:16 Story graphics
from official product front/back images.
"""

import os
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

COLOR_BG_DARK = (15, 12, 10)         # #0F0C0A
COLOR_CARD_DARK = (26, 21, 17)       # #1A1511
COLOR_BORDER = (48, 38, 32)          # #302620
COLOR_WHITE = (252, 250, 248)
COLOR_CREAM = (228, 208, 178)        # Vintage western beige
COLOR_ACCENT_RED = (195, 42, 38)     # Outlaw Crimson
COLOR_MUTED = (165, 155, 145)

def get_font(size, bold=False):
    font_path = "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    try:
        return ImageFont.truetype(font_path, size)
    except:
        return ImageFont.load_default()

def cutout_shirt(img_path, target_box_size):
    src = Image.open(img_path).convert("RGBA")
    arr = np.array(src)
    
    r, g, b, _ = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    is_white = (r > 238) & (g > 238) & (b > 238)
    alpha = np.where(is_white, 0, 255).astype(np.uint8)
    arr[:, :, 3] = alpha
    
    cutout = Image.fromarray(arr)
    bbox = cutout.getbbox()
    if bbox:
        cutout = cutout.crop(bbox)
        
    img_ratio = cutout.width / cutout.height
    target_w, target_h = target_box_size
    target_ratio = target_w / target_h
    
    if img_ratio > target_ratio:
        new_w = target_w
        new_h = int(new_w / img_ratio)
    else:
        new_h = target_h
        new_w = int(new_h * img_ratio)
        
    return cutout.resize((new_w, new_h), Image.Resampling.LANCZOS)

def paste_with_shadow(bg_img, cutout_rgba, pos, shadow_offset=(0, 15), shadow_blur=25, shadow_alpha=120):
    x, y = pos
    shadow_mask = cutout_rgba.split()[3].point(lambda p: shadow_alpha if p > 50 else 0)
    shadow = Image.new("RGBA", cutout_rgba.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, shadow_alpha), (0, 0), shadow_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur))
    
    bg_img.paste(shadow, (x + shadow_offset[0], y + shadow_offset[1]), shadow)
    bg_img.paste(cutout_rgba, (x, y), cutout_rgba)

def generate_pack(front_path, back_path, title, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Portrait 4:5 (1080x1350)
    print("Generating 4:5 Instagram Feed Portrait...")
    W, H = 1080, 1350
    p1 = Image.new("RGB", (W, H), COLOR_BG_DARK)
    d1 = ImageDraw.Draw(p1)
    d1.line([(0, 0), (W, 0)], fill=COLOR_ACCENT_RED, width=8)
    d1.text((W//2, 50), "OFFICIAL MERCHANDISE", fill=COLOR_ACCENT_RED, font=get_font(20, bold=True), anchor="mt")
    d1.text((W//2, 85), "JACK HOWLIN'", fill=COLOR_CREAM, font=get_font(44, bold=True), anchor="mt")
    d1.text((W//2, 142), f'"{title}" HEAVYWEIGHT TEE', fill=COLOR_WHITE, font=get_font(22, bold=False), anchor="mt")
    
    d1.rounded_rectangle([40, 190, 1040, 1000], radius=20, fill=COLOR_CARD_DARK, outline=COLOR_BORDER, width=2)
    f_cut = cutout_shirt(front_path, (440, 680))
    b_cut = cutout_shirt(back_path, (440, 680))
    
    paste_with_shadow(p1, f_cut, (70 + (440 - f_cut.width)//2, 220 + (680 - f_cut.height)//2))
    paste_with_shadow(p1, b_cut, (570 + (440 - b_cut.width)//2, 220 + (680 - b_cut.height)//2))
    
    d1.rounded_rectangle([110, 915, 470, 970], radius=10, fill=COLOR_BG_DARK, outline=COLOR_BORDER, width=1)
    d1.text((290, 942), "FRONT CHEST MARK", fill=COLOR_WHITE, font=get_font(18, bold=True), anchor="mm")
    d1.rounded_rectangle([610, 915, 970, 970], radius=10, fill=COLOR_BG_DARK, outline=COLOR_BORDER, width=1)
    d1.text((790, 942), "FULL BACK ARTWORK", fill=COLOR_ACCENT_RED, font=get_font(18, bold=True), anchor="mm")
    
    d1.rounded_rectangle([40, 1030, 1040, 1270], radius=20, fill=COLOR_CARD_DARK, outline=COLOR_BORDER, width=2)
    d1.text((W//2, 1060), "100% RING-SPUN COTTON  •  6.1 OZ HEAVYWEIGHT  •  COMFORT COLORS 1717", fill=COLOR_CREAM, font=get_font(19, bold=True), anchor="mt")
    d1.text((W//2, 1105), "Vintage Distressed Screen Print  |  Relaxed Fit  |  Sizes S — 4XL", fill=COLOR_MUTED, font=get_font(18, bold=False), anchor="mt")
    d1.rounded_rectangle([300, 1170, 780, 1240], radius=24, fill=COLOR_ACCENT_RED)
    d1.text((W//2, 1205), "GET YOURS AT JACKHOWLIN.COM", fill=COLOR_WHITE, font=get_font(20, bold=True), anchor="mm")
    p1.save(os.path.join(output_dir, "01_instagram_feed_portrait.jpg"), quality=95)

    # 2. Square 1:1 (1080x1080)
    print("Generating 1:1 Instagram Square Feed...")
    W, H = 1080, 1080
    p2 = Image.new("RGB", (W, H), COLOR_BG_DARK)
    d2 = ImageDraw.Draw(p2)
    d2.line([(0, 0), (W, 0)], fill=COLOR_ACCENT_RED, width=6)
    d2.rounded_rectangle([40, 40, 560, 1040], radius=20, fill=COLOR_CARD_DARK, outline=COLOR_BORDER, width=2)
    b_cut_sq = cutout_shirt(back_path, (480, 920))
    paste_with_shadow(p2, b_cut_sq, (40 + (520 - b_cut_sq.width)//2, 40 + (1000 - b_cut_sq.height)//2))
    
    rx = 600
    d2.text((rx, 70), "JACK HOWLIN'", fill=COLOR_CREAM, font=get_font(34, bold=True))
    d2.text((rx, 120), f'"{title}."', fill=COLOR_WHITE, font=get_font(26, bold=True))
    d2.text((rx, 160), "I still wear this crown.\"", fill=COLOR_ACCENT_RED, font=get_font(26, bold=True))
    d2.line([(rx, 220), (rx + 430, 220)], fill=COLOR_BORDER, width=2)
    
    specs = [
        "• Outlaw Americana Distressed Print",
        "• 6.1 oz Heavyweight Fabric",
        "• 100% Ring-Spun Combed Cotton",
        "• Dual Front & Back Artwork",
        "• Pre-shrunk Relaxed Fit (S-4XL)"
    ]
    sy = 250
    for s in specs:
        d2.text((rx, sy), s, fill=COLOR_MUTED, font=get_font(20, bold=False))
        sy += 44
        
    d2.rounded_rectangle([rx, 500, rx + 430, 830], radius=16, fill=COLOR_CARD_DARK, outline=COLOR_BORDER, width=2)
    f_cut_mini = cutout_shirt(front_path, (210, 290))
    paste_with_shadow(p2, f_cut_mini, (rx + 15, 520), shadow_blur=15)
    d2.text((rx + 320, 610), "FRONT MARK", fill=COLOR_CREAM, font=get_font(18, bold=True), anchor="mm")
    d2.text((rx + 320, 650), "Subtle Vintage", fill=COLOR_MUTED, font=get_font(16, bold=False), anchor="mm")
    d2.text((rx + 320, 678), "Cowboy Hat Logo", fill=COLOR_MUTED, font=get_font(16, bold=False), anchor="mm")
    d2.rounded_rectangle([rx, 870, rx + 430, 970], radius=16, fill=COLOR_ACCENT_RED)
    d2.text((rx + 215, 920), "SHOP NOW • JACKHOWLIN.COM", fill=COLOR_WHITE, font=get_font(20, bold=True), anchor="mm")
    p2.save(os.path.join(output_dir, "02_instagram_square_feed.jpg"), quality=95)

    # 3. Story 9:16 (1080x1920)
    print("Generating 9:16 Instagram/TikTok Story...")
    W, H = 1080, 1920
    p3 = Image.new("RGB", (W, H), COLOR_BG_DARK)
    d3 = ImageDraw.Draw(p3)
    d3.line([(0, 0), (W, 0)], fill=COLOR_ACCENT_RED, width=10)
    d3.text((W//2, 110), "OFFICIAL MERCH DROP", fill=COLOR_ACCENT_RED, font=get_font(24, bold=True), anchor="mt")
    d3.text((W//2, 160), "JACK HOWLIN'", fill=COLOR_CREAM, font=get_font(56, bold=True), anchor="mt")
    d3.text((W//2, 235), f"{title.upper()} TEE", fill=COLOR_WHITE, font=get_font(28, bold=False), anchor="mt")
    
    d3.rounded_rectangle([60, 290, 1020, 1340], radius=24, fill=COLOR_CARD_DARK, outline=COLOR_BORDER, width=2)
    b_cut_st = cutout_shirt(back_path, (880, 960))
    paste_with_shadow(p3, b_cut_st, (60 + (960 - b_cut_st.width)//2, 310 + (1000 - b_cut_st.height)//2), shadow_blur=30)
    
    d3.rounded_rectangle([90, 920, 390, 1300], radius=16, fill=COLOR_BG_DARK, outline=COLOR_ACCENT_RED, width=2)
    f_cut_st_mini = cutout_shirt(front_path, (260, 310))
    paste_with_shadow(p3, f_cut_st_mini, (110, 940), shadow_blur=10)
    d3.text((240, 1265), "FRONT CHEST MARK", fill=COLOR_CREAM, font=get_font(15, bold=True), anchor="mm")
    
    d3.text((W//2, 1385), "\"Wear the hat. Keep the crown.\"", fill=COLOR_CREAM, font=get_font(32, bold=True), anchor="mt")
    d3.text((W//2, 1435), "Heavyweight 6.1 oz 100% Ring-Spun Cotton — Relaxed Fit", fill=COLOR_MUTED, font=get_font(22, bold=False), anchor="mt")
    d3.rounded_rectangle([160, 1520, 920, 1650], radius=32, fill=COLOR_ACCENT_RED)
    d3.text((W//2, 1585), "TAP TO GET YOURS", fill=COLOR_WHITE, font=get_font(34, bold=True), anchor="mm")
    d3.text((W//2, 1710), "LIMITED RUN • SHIPS WORLDWIDE", fill=COLOR_MUTED, font=get_font(20, bold=True), anchor="mt")
    d3.text((W//2, 1750), "jackhowlin.com", fill=COLOR_CREAM, font=get_font(22, bold=False), anchor="mt")
    p3.save(os.path.join(output_dir, "03_instagram_tiktok_story.jpg"), quality=95)
    
    print(f"Pack generated successfully in {output_dir}!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Jack Howlin Social Media Pack")
    parser.add_argument("--front", required=True, help="Path to front product image")
    parser.add_argument("--back", required=True, help="Path to back product image")
    parser.add_argument("--title", default="HATE ME ALL YOU WANT", help="Merch / song title")
    parser.add_argument("--output", default="marketplace_cards/social_pack", help="Output directory")
    args = parser.parse_args()
    
    generate_pack(args.front, args.back, args.title, args.output)
