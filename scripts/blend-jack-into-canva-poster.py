import cv2
import numpy as np
import os

def create_jack_composite():
    # 1. Load Image 1 (Canva Design 3 - 1080x1920)
    target = cv2.imread('projects/hate-me-social-production/canva_design_3.png')
    h_t, w_t, _ = target.shape

    # 2. Load Source (Jack Howlin Master Still - 1152x2048)
    source = cv2.imread('projects/hate-me-seedance-30s/stills/jack-howlin-master-still.png')

    # Jack head region in source:
    # y: 220 to 760, x: 350 to 800 (Jack's face, beard, hair)
    jack_head = source[210:760, 350:800] # (550, 450)

    # In target (Image 1), the head is located around x: 420..680, y: 440..780
    # Target head dimensions approx width: 250..280, height: 340..370
    # Let's scale Jack's head to match target dimensions
    target_w = 260
    target_h = int(jack_head.shape[0] * (target_w / jack_head.shape[1]))
    jack_head_resized = cv2.resize(jack_head, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    # Create an elliptical soft mask for Jack's face/hair
    mask = np.zeros((target_h, target_w), dtype=np.uint8)
    center_mask = (target_w // 2, int(target_h * 0.48))
    axes = (int(target_w * 0.44), int(target_h * 0.46))
    cv2.ellipse(mask, center_mask, axes, 0, 0, 360, 255, -1)

    # Blur the mask edges for smooth transition
    mask_feathered = cv2.GaussianBlur(mask, (31, 31), 15)

    # Destination center on target
    dest_center = (545, 620)

    # Seamless clone (Mixed / Normal)
    # Using seamlessClone on 8-bit images
    # Mask must be single channel 255
    ret_clone = cv2.seamlessClone(jack_head_resized, target, mask, dest_center, cv2.NORMAL_CLONE)

    # Also test soft alpha blend for hair & edges
    # Alpha blend version:
    x1 = dest_center[0] - target_w // 2
    y1 = dest_center[1] - target_h // 2
    x2 = x1 + target_w
    y2 = y1 + target_h

    # Color match Jack's head to target local area
    target_roi = target[y1:y2, x1:x2].astype(np.float32)
    jack_roi = jack_head_resized.astype(np.float32)

    # Match mean and std dev per channel (Reinhard color transfer)
    for c in range(3):
        m_t, s_t = np.mean(target_roi[:, :, c]), np.std(target_roi[:, :, c]) + 1e-5
        m_s, s_s = np.mean(jack_roi[:, :, c]), np.std(jack_roi[:, :, c]) + 1e-5
        jack_roi[:, :, c] = ((jack_roi[:, :, c] - m_s) / s_s) * (s_t * 1.05) + (m_t * 0.98)
    jack_roi = np.clip(jack_roi, 0, 255).astype(np.uint8)

    alpha = (mask_feathered.astype(np.float32) / 255.0)[:, :, np.newaxis]
    target_blend = target.copy()
    target_blend[y1:y2, x1:x2] = (alpha * jack_roi + (1.0 - alpha) * target[y1:y2, x1:x2]).astype(np.uint8)

    # Save both candidates
    out_clone = 'projects/hate-me-social-production/jack_canva_seamless_clone.png'
    out_blend = 'projects/hate-me-social-production/jack_canva_alpha_blend.png'

    cv2.imwrite(out_clone, ret_clone)
    cv2.imwrite(out_blend, target_blend)

    print('Successfully generated seamless clone and alpha blend!')
    print('Clone file:', out_clone)
    print('Blend file:', out_blend)

if __name__ == '__main__':
    create_jack_composite()
