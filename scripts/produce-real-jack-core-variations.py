import cv2
import numpy as np
import os

def create_solid_core_posters():
    # Base layout from Canva (Image 1)
    base = cv2.imread('projects/hate-me-social-production/canva_design_3.png')
    h_b, w_b, _ = base.shape

    # Let's extract the clean background, frame, and text from Image 1:
    # Top text is y: 0 to 420
    # Bottom text is y: 1200 to 1920
    # Outer frame borders are left: 0..60, right: 1020..1080

    # 1. Variant 1: Jack Core Set #8 (Dark Studio Half-Figure - Direct Head & Torso Integration)
    c8 = cv2.imread('projects/jack-core-set/core_8_studio_halffiguur_zwart.jpg')
    # Crop Jack's head from c8: y 100:500, x 380:710
    head8 = c8[100:500, 380:710]
    head8_resized = cv2.resize(head8, (270, 320), interpolation=cv2.INTER_LANCZOS4)

    mask8 = np.zeros((320, 270), dtype=np.uint8)
    cv2.ellipse(mask8, (135, 155), (120, 145), 0, 0, 360, 255, -1)
    mask8_blur = cv2.GaussianBlur(mask8, (11, 11), 5)
    a8 = (mask8_blur.astype(np.float32) / 255.0)[:, :, np.newaxis]

    var1 = base.copy()
    y_pos, x_pos = 445, 410
    roi1 = var1[y_pos:y_pos+320, x_pos:x_pos+270]
    var1[y_pos:y_pos+320, x_pos:x_pos+270] = (a8 * head8_resized.astype(np.float32) + (1.0 - a8) * roi1.astype(np.float32)).astype(np.uint8)
    cv2.imwrite('projects/hate-me-social-production/jack_real_core_v1_studio.png', var1)

    # 2. Variant 2: Jack Core Set #5 (Warm Saloon Bar Light)
    c5 = cv2.imread('projects/jack-core-set/core_5_bar_portret_warm_licht.jpg')
    # Crop Jack's head from c5: y 160:600, x 230:680
    head5 = c5[160:600, 230:680]
    head5_resized = cv2.resize(head5, (275, 330), interpolation=cv2.INTER_LANCZOS4)

    mask5 = np.zeros((330, 275), dtype=np.uint8)
    cv2.ellipse(mask5, (137, 160), (122, 150), 0, 0, 360, 255, -1)
    mask5_blur = cv2.GaussianBlur(mask5, (11, 11), 5)
    a5 = (mask5_blur.astype(np.float32) / 255.0)[:, :, np.newaxis]

    var2 = base.copy()
    y_pos2, x_pos2 = 440, 408
    roi2 = var2[y_pos2:y_pos2+330, x_pos2:x_pos2+275]
    var2[y_pos2:y_pos2+330, x_pos2:x_pos2+275] = (a5 * head5_resized.astype(np.float32) + (1.0 - a5) * roi2.astype(np.float32)).astype(np.uint8)
    cv2.imwrite('projects/hate-me-social-production/jack_real_core_v2_bar.png', var2)

    # 3. Variant 3: Jack Core Set #4 (Outlaw Cowboy Hat & Desert Stance)
    c4 = cv2.imread('projects/jack-core-set/core_4_cowboy_hoed_woestijn.jpg')
    # Crop Jack with cowboy hat from c4: y 300:750, x 180:550
    head4 = c4[300:750, 180:550]
    head4_resized = cv2.resize(head4, (310, 370), interpolation=cv2.INTER_LANCZOS4)

    mask4 = np.zeros((370, 310), dtype=np.uint8)
    cv2.ellipse(mask4, (155, 185), (145, 175), 0, 0, 360, 255, -1)
    mask4_blur = cv2.GaussianBlur(mask4, (11, 11), 5)
    a4 = (mask4_blur.astype(np.float32) / 255.0)[:, :, np.newaxis]

    var3 = base.copy()
    y_pos3, x_pos3 = 400, 390
    roi3 = var3[y_pos3:y_pos3+370, x_pos3:x_pos3+310]
    var3[y_pos3:y_pos3+370, x_pos3:x_pos3+310] = (a4 * head4_resized.astype(np.float32) + (1.0 - a4) * roi3.astype(np.float32)).astype(np.uint8)
    cv2.imwrite('projects/hate-me-social-production/jack_real_core_v3_hat.png', var3)

    # 4. Variant 4: Full Jack Core Set #9 (Saloon Acoustic Guitar Center Frame)
    c9 = cv2.imread('projects/jack-core-set/core_9_saloon_gitaar_whiskey.jpg')
    # Resize c9 to center body area y: 380 to 1250, x: 100 to 980
    c9_body = cv2.resize(c9, (880, 880), interpolation=cv2.INTER_LANCZOS4)

    # Feathered rectangular mask with soft gradient edges
    mask9 = np.ones((880, 880), dtype=np.float32)
    # Fade top, bottom, left, right edges
    fade = 60
    for i in range(fade):
        f = i / float(fade)
        mask9[i, :] *= f
        mask9[-1-i, :] *= f
        mask9[:, i] *= f
        mask9[:, -1-i] *= f

    a9 = mask9[:, :, np.newaxis]

    var4 = base.copy()
    y_pos4, x_pos4 = 370, 100
    roi4 = var4[y_pos4:y_pos4+880, x_pos4:x_pos4+880].astype(np.float32)
    var4[y_pos4:y_pos4+880, x_pos4:x_pos4+880] = (a9 * c9_body.astype(np.float32) + (1.0 - a9) * roi4).astype(np.uint8)
    cv2.imwrite('projects/hate-me-social-production/jack_real_core_v4_saloon_guitar.png', var4)

    print('Generated all 4 distinct solid Jack Core Set posters!')

if __name__ == '__main__':
    create_solid_core_posters()
