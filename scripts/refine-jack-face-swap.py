import cv2
import numpy as np
from PIL import Image, ImageFilter
import subprocess
import os
import json

def refine_blend():
    # 1. Target (Image 1 - Canva 1080x1920)
    target = cv2.imread('projects/hate-me-social-production/canva_design_3.png')
    h_t, w_t, _ = target.shape

    # 2. Source (Jack Master Still 1152x2048)
    source = cv2.imread('projects/hate-me-seedance-30s/stills/jack-howlin-master-still.png')

    # Jack's face coordinates in source:
    # Eyes approx (x=520, y=410) and (x=645, y=415)
    # Nose approx (x=580, y=480)
    # Chin/beard bottom approx (x=580, y=630)
    # Crop box around Jack's head:
    # x: 380 to 760 (width 380), y: 220 to 680 (height 460)
    jack_head = source[220:690, 370:770]
    jh_h, jh_w, _ = jack_head.shape

    # In Target (Image 1):
    # Target head box approx x: 420 to 680 (width 260), y: 440 to 760 (height 320)
    # Scale Jack head to match target dimensions:
    scale_w = 265
    scale_h = int(jh_h * (scale_w / jh_w))
    jack_scaled = cv2.resize(jack_head, (scale_w, scale_h), interpolation=cv2.INTER_LANCZOS4)

    # Position on target:
    # Target face center is approx (x=545, y=595)
    pos_x = 412
    pos_y = 442

    # Target ROI
    target_roi = target[pos_y:pos_y+scale_h, pos_x:pos_x+scale_w].astype(np.float32)
    jack_roi = jack_scaled.astype(np.float32)

    # Reinhard Color & Luminance Matching:
    # Match the warm amber studio lighting and contrast of Image 1
    for c in range(3):
        m_t, s_t = np.mean(target_roi[:, :, c]), np.std(target_roi[:, :, c]) + 1e-5
        m_s, s_s = np.mean(jack_roi[:, :, c]), np.std(jack_roi[:, :, c]) + 1e-5
        jack_roi[:, :, c] = ((jack_roi[:, :, c] - m_s) / s_s) * (s_t * 1.02) + (m_t * 1.0)
    jack_matched = np.clip(jack_roi, 0, 255).astype(np.uint8)

    # Create precise alpha mask:
    # Smooth oval for face and hair, soft blend on outer collar/shoulders
    mask = np.zeros((scale_h, scale_w), dtype=np.uint8)
    center = (int(scale_w * 0.50), int(scale_h * 0.48))
    axes = (int(scale_w * 0.44), int(scale_h * 0.46))
    cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)

    # Feathered gaussian blur for seamless boundary
    mask_blur = cv2.GaussianBlur(mask, (35, 35), 18)
    alpha = (mask_blur.astype(np.float32) / 255.0)[:, :, np.newaxis]

    # Alpha blending
    composite = target.copy()
    blended_area = (alpha * jack_matched + (1.0 - alpha) * target[pos_y:pos_y+scale_h, pos_x:pos_x+scale_w]).astype(np.uint8)
    composite[pos_y:pos_y+scale_h, pos_x:pos_x+scale_w] = blended_area

    # Also test Poisson Seamless Clone on exact center
    dest_center = (pos_x + scale_w // 2, pos_y + scale_h // 2)
    seamless_composite = cv2.seamlessClone(jack_scaled, target, mask, dest_center, cv2.NORMAL_CLONE)

    out_poster = 'projects/hate-me-social-production/jack_howlin_dark_americana_perfect_poster.png'
    out_seamless = 'projects/hate-me-social-production/jack_howlin_dark_americana_seamless.png'

    cv2.imwrite(out_poster, composite)
    cv2.imwrite(out_seamless, seamless_composite)
    print('Rendered posters:', out_poster, out_seamless)

if __name__ == '__main__':
    refine_blend()
