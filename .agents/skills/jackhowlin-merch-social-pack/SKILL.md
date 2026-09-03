---
name: jackhowlin-merch-social-pack
description: Use when creating, designing, producing, or automating e-commerce marketplace cards, social media packs (Instagram 4:5, Feed 1:1, Story 9:16), or lifestyle photoshoots for Jack Howlin merchandise, apparel, vinyl, and tour products.
---

# Jack Howlin Merch & Social Media Pack Producer

## 🤠 Overview
De **Jack Howlin Merch & Social Pack Producer** transformeert officiële productfoto's (zoals Fourthwall/Shopify studio mockups) naar:
1. **Kie.ai AI Lifestyle Photoshoots (Seedream Image-to-Image) — [KERNTAAK]:** Cinematische outlaw foto's waarin Jack Howlin zelf de merchandise draagt op locatie (highway, honky-tonk, motel, pickup truck cab) met behoud van het exacte artwork en logo's.
2. **E-Commerce & Social Media Graphics (Pillow):** Naadloze 4:5 Portrait, 1:1 Square en 9:16 Story templates met specs en sterke CTA.
3. **Outlaw Americana Copy & Captions:** Rauwe, ongepolijste social post teksten (Behind-the-scenes / How It's Made / Outlaw Anthem).

---

## 🧭 Wanneer te gebruiken
* De gebruiker vraagt om een social media post, lifestyle shoot of merch pack voor een productlink of kledingstuk van Jack Howlin.
* De gebruiker wil realistische foto's van Jack Howlin die de merch draagt in outlaw settings.
* **BELANGRIJKE VASTE REGEL:** Als de gebruiker het over posten of inplannen heeft, **ALTIJD direct het Jack Howlin Dashboard (`/calendar`, Firestore `posts` collectie)** gebruiken als centrale commandocentrale en opslag.

---

## ⚡ 1. KERNSTAP: Kie.ai Seedream Image-to-Image Photoshoots

> [!IMPORTANT]
> Gebruik **ALTIJD** de publieke Fourthwall/Shopify productfoto URL's als `--image_urls` in `bytedance_seedream_image` zodat het AI model de exacte kleuren, zeefdruk en logo's 1-op-1 overneemt op het kledingstuk van Jack Howlin.

### A. Vaste Jack Howlin Karakter Anchors:
* **Gezicht & Bouw:** `handsome outlaw country musician Jack Howlin, mid 30s, rugged full brown beard and mustache, sharp masculine jawline, intense gray-blue eyes, wavy dark brown hair`
* **Fotostijl:** `cinematic 35mm film photography, natural grain, warm amber and tungsten lighting, moody outlaw Americana aesthetic`

### B. Beproefde Scene Presets per Producttype:

#### 1. T-Shirts & Crewnecks / Hoodies (Achterkant Focus — 1:1 Feed & 9:16 Story)
* **Locatie:** Roadhouse veranda of motel bij schemering
* **Prompt:**
  ```text
  Atmospheric rear 3/4 cinematic shot of outlaw country musician Jack Howlin (mid 30s, rugged brown beard, wavy brown hair) standing on the weathered wooden porch of a Texas honky-tonk roadhouse at night. He is wearing the exact black heavyweight [shirt/crewneck] from the reference image, prominently displaying the full authentic distressed 'HATE ME ALL YOU WANT' crimson sunset banjo artwork and tagline across the back in sharp detail. Holding a vintage acoustic guitar case in one hand, warm string lights and glowing neon sign in background, 35mm film grain.
  ```

#### 2. T-Shirts & Jackets (Voorkant Borstlogo Focus — 9:16 Story / Reels Cover)
* **Locatie:** Woestijnsnelweg leunend tegen zwarte vintage pickup truck
* **Prompt:**
  ```text
  Cinematic atmospheric 9:16 vertical portrait of outlaw country-rock artist Jack Howlin (mid 30s, rugged brown beard and mustache, chiseled masculine jawline, wavy brown hair, wearing a tan camel-brown canvas work jacket unzipped, wearing the official black graphic shirt with small Jack Howlin western mark on left chest from reference image). Leaning against a vintage 1978 black pickup truck parked on an empty highway road at dusk, warm amber desert horizon glow, moody cinematic lighting, 35mm film grain.
  ```

#### 3. Caps & Headwear (Close-Up Portrait — 1:1 Feed & 9:16 Story)
* **Locatie:** Binnenin vintage pickup truck cabine of bij motelraam
* **Prompt:**
  ```text
  Cinematic close-up portrait of outlaw country rock artist Jack Howlin (handsome mid 30s, full rugged brown beard and mustache, chiseled jawline, intense eyes) wearing the exact distressed washed black cotton dad cap from the reference image with the embroidered Jack Howlin western cowboy logo on the front. Sitting in the driver seat of a vintage 1978 pickup truck, warm golden hour sunlight coming through the windshield, 35mm film aesthetic, photorealistic.
  ```

---

## 🛠️ 2. Uitvoering via Kie CLI

```bash
$env:KIE_AI_API_KEY="your-api-key"

# 1. Start Seedream 5 Lite Image-to-Image:
npm run kie -- bytedance_seedream_image \
  --version 5-lite \
  --aspect_ratio 9:16 \
  --quality high \
  --image_urls "<public_product_image_url>" \
  --prompt "<scene_prompt_met_jack_howlin_en_referentie>"

# 2. Wacht op voltooiing en download het resultaat:
npm run kie -- wait_for_task --task_id "<task_id>"
```

> [!NOTE]
> Mocht het Kie saldo ontoereikend zijn (`Credits insufficient`), geef dan direct de kant-en-klare CLI commando's en prompts aan de gebruiker zodat ze met 1 klik kunnen draaien na het opwaarderen.

---

## 🎨 3. Social Media Graphics & Listing Cards (Pillow)

Voer het script uit voor ondersteunende e-commerce en feed graphics:
```bash
python .agents/skills/jackhowlin-merch-social-pack/scripts/generate-merch-pack.py \
  --front "path/to/front.jpg" \
  --back "path/to/back.jpg" \
  --title "PRODUCT TITLE" \
  --output "path/to/social_pack"
```

---

## ✍️ 4. Ready-to-Publish Copywriting

Koppel de gegenereerde Kie lifestyle foto's altijd aan een van de drie Outlaw Copy Templates in `references/brand-voice.md` (*Behind the scenes / How it's made*, *Highway Solitude*, of *Defiance Statement*).
