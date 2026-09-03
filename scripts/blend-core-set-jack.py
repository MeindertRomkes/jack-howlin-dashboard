import cv2
import numpy as np
import os

def blend_core_set(core_img_path, target_img_path, crop_box, target_box, out_path, color_transfer=True):
    # 1. Target (Image 1 - Canva 1080x1920)
    target = cv2.imread(target_img_path)
    source = cv2.imread(core_img_path)

    # Crop head from Core Set
    y1_s, y2_s, x1_s, x2_s = crop_box
    jack_head = source[y1_s:y2_s, x1_s:x2_s]
    jh_h, jh_w, _ = jack_head.shape

    # Target Box
    y1_t, y2_t, x1_t, x2_t = target_box
    target_w = x2_t - x1_t
    target_h = y2_t - y1_t

    # Scale Jack head
    jack_scaled = cv2.resize(jack_head, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    # Target ROI
    target_roi = target[y1_t:y2_t, x1_t:x2_t].astype(np.float32)
    jack_roi = jack_scaled.astype(np.float32)

    if color_transfer:
        for c in range(3):
            m_t, s_t = np.mean(target_roi[:, :, c]), np.std(target_roi[:, :, c]) + 1e-5
            m_s, s_s = np.mean(jack_roi[:, :, c]), np.std(jack_roi[:, :, c]) + 1e-5
            jack_roi[:, :, c] = ((jack_roi[:, :, c] - m_s) / s_s) * (s_t * 1.0) + (m_t * 1.0)
    jack_matched = np.clip(jack_roi, 0, 255).astype(np.uint8)

    # Precise oval mask
    mask = np.zeros((target_h, target_w), dtype=np.uint8)
    center = (int(target_w * 0.50), int(target_h * 0.48))
    axes = (int(target_w * 0.42), int(target_h * 0.45))
    cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)
    mask_blur = cv2.GaussianBlur(mask, (31, 31), 15)
    alpha = (mask_blur.astype(np.float32) / 255.0)[:, :, np.newaxis]

    composite = target.copy()
    blended = (alpha * jack_matched + (1.0 - alpha) * target[y1_t:y2_t, x1_t:x2_t]).astype(np.uint8)
    composite[y1_t:y2_t, x1_t:x2_t] = blended

    cv2.imwrite(out_path, composite)
    print('Generated:', out_path)

if __name__ == '__main__':
    # Variant A: Core 8 (Studio Half-Figure Black - Canonical Jack)
    # in Core 8 (1024x1024): head is approx y: 110 to 460, x: 410 to 710
    blend_core_set(
        'projects/jack-core-set/core_8_studio_halffiguur_zwart.jpg',
        'projects/hate-me-social-production/canva_design_3.png',
        (110, 460, 410, 710),
        (450, 770, 415, 680),
        'projects/hate-me-social-production/jack_core_set_variant_a.png'
    )

    # Variant B: Core 5 (Bar Portrait Warm Light - Canonical Jack)
    # in Core 5 (1024x1024): head is approx y: 160 to 580, x: 230 to 670
    blend_core_set(
        'projects/jack-core-set/core_5_bar_portret_warm_licht.jpg',
        'projects/hate-me-social-production/canva_design_3.png',
        (160, 580, 230, 670),
        (450, 770, 415, 680),
        'projects/hate-me-social-production/jack_core_set_variant_b.png'
    )

    # Variant C: Core 2 (Close-up Portrait Forest - Canonical Jack)
    # in Core 2 (1024x1024): head is approx y: 40 to 640, x: 210 to 790
    blend_core_set(
        'projects/jack-core-set/core_2_close_up_portret_bos.jpg',
        'projects/hate-me-social-production/canva_design_3.png',
        (40, 640, 210, 790),
        (450, 770, 415, 680),
        'projects/hate-me-social-production/jack_core_set_variant_c.png'
    )
