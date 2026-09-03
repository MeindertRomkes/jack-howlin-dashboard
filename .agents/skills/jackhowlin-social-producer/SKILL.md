---
name: jackhowlin-social-producer
description: Use when creating, brainstorming, producing, or scheduling social media content (photos, videos, reels, shorts, captions, and campaign packs) for Jack Howlin using Kie.ai (Seedream 5 Pro, Seedance 2.5) and the canonical Jack Core Set.
---

# Jack Howlin Social Producer

## 🤠 Overview
De **Jack Howlin Social Producer** is de interactieve creatieve en strategische engine voor het produceren van hoogwaardige social media posts en videocontent voor Outlaw Country-Rock artiest **Jack Howlin**.

De skill bewaakt 100% gezichts- en kledingconsistentie via de **Jack Core Set**, integreert **ByteDance Seedream 5 Pro** en **Seedance 2.5** via Kie.ai (met beeld- én audioreferenties), adviseert op basis van historische dashboard analytics, en plant goedgekeurde posts in op de contentkalender.

---

## 🧭 Wanneer te gebruiken
* De gebruiker wil een post, video, reel of TikTok maken voor Jack Howlin (*"Ik wil iets op socials plaatsen"* of *"Maak een nieuwe video voor socials"*).
* **BELANGRIJKE VASTE REGEL:** Als de gebruiker het over posten of inplannen heeft, **ALTIJD direct het Jack Howlin Dashboard (`/calendar`, Firestore `posts` collectie)** gebruiken als centrale commandocentrale en opslag.
* Brainstormen over concepten, stijlkeuzes, audiofragmenten en captions.
* Produceren van video's met vocale lip-sync OF stoïcijnse sfeerbeelden (niet-zingend).
* Genereren van single posts of wekelijkse 3-tot-5 post campagnepakketten.

---

## 📋 De Interactieve Brainstorm- & Productie Flow

```
┌───────────────────────────┐
│ 1. Brainstorm & Advies    │◄── Vraag formaat, doel, platform, stijl & track
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 2. Audio Snipping & Host  │◄── Knip snippet & upload naar Firebase Storage
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 3. Core Set Still (S5Pro) │◄── Genereer 4K Ankerbeeld via Seedream 5 Pro
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 4. Seedance 2.5 AI Video  │◄── Genereer video met reference_image + reference_audio
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 5. Mastering & Remuxing   │◄── Mux 1080x1920 MP4 met 48kHz stereo master audio & grain
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 6. Goedkeuring & Kalender │◄── Finale review en planning via schedule-post.js
└─────────────┬─────────────┘
```

---

## 💬 1. De Consultatievragen & Track Context

1. **Formaat & Type:**
   * Foto (Seedream 5 Pro) of Video (Seedance 2.5)?
   * Aspect Ratio: `9:16 Vertical` (Reels/TikTok/Shorts), `1:1 Square` (Feed), of `16:9 Landscape`.
2. **Data-Gedreven Suggesties:**
   * Raadpleeg `references/data-intelligence-matrix.md` (bijv. *"Highway visuals met de bas-drop scoren momenteel 84% retentie"*).
3. **Muziek & Fragment:**
   * Welke track uit Jack's catalogus (*Hate Me All You Want*, *I Still Wear This Crown*, *Whiskey & Rust*)?
   * *Let op:* Nummers zoals *Hate Me All You Want* zijn al een tijd uit; behandel ze als gevestigde outlaw anthems/live staples in de caption.
4. **Vocal Performance Modus:**
   * **Modus 1 (A-Roll Lip-Sync):** Jack zingt met mond- en gitaarbewegingen.
   * **Modus 2 (Atmospheric Outlaw Mood):** Jack zwijgt stoïcijns (mond dicht), ademt rustig, wind in haar/jas, intense blik in de lens.
5. **Visuele Stijlpresets:**
   * **1. Midnight Highway Noir:** Mistige nachtweg, pick-up truck, neon diner glow.
   * **2. Dark Studio Analog:** Warme amber studio, buizenversterkers, vintage Shure microfoon.
   * **3. Outlaw Saloon Grit:** Donkere tavern, kerosinelamp, whiskey & gitaarkoffer.
6. **Captions:**
   * Genereer 2 outlaw varianten conform `references/brand-voice.md`.

---

## 🎨 2. Jack Howlin Multi-Level Master Referentie Binding

> [!IMPORTANT]
> **STRIKTE REGEL VOOR ALLE PRODUCTIES:** Gebruik **NOOIT** meer de oude losse multi-image core set (omdat 20 losse afbeeldingen honderden onnodige credits kosten en inconsistentie veroorzaken). 
> Gebruik **ALTIJD** de officiële **Multi-Level Master Referentie**:
> * **Lokaal pad:** `projects/jack-core-set/jack_howlin_multilevel_reference.jpg`
> * **Cloud URL:** `https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fjack_howlin_multilevel_reference.jpg?alt=media&token=f1a7ae6e-507d-41b6-97db-71305e38484a`

### Vaste Wardrobe Anchors in Prompts:
* `wearing a tan camel-brown heavy canvas work jacket with dual front chest flap pockets`
* `over an unbuttoned charcoal grey cotton henley shirt`
* `full rugged brown beard and mustache, chiseled masculine jawline, wavy brown hair`

---

## 👥 3. Cinematic Universe Personages (11 Karakters)
Raadpleeg voor alle personages, scènes en interacties `references/character-bible.md` (en `docs/universe/character-bible.md`):
* **Jack Howlin'** (Hoofdpersoon — Ernstig, kaak klem onder spanning)
* **Rosie Ray** (Warmte & gelijke — Donkerrood overshirt, sproeten, kalme directe blik)
* **Sheriff Silas Crowe** (Beheerste dreiging — Doffe badge, koud glimlachje)
* **Mae Bell Carter** (Praktische daadkracht — Denim overall, litteken wenkbrauw)
* **June Holloway** (De stille waarnemer — Petrolblauw, motel sleutel)
* **Cole Ransom** (Ontworpen rebellie — Zwart suède met borduursel, gepolijst zilver)
* **Hank "Blacktop" Mercer** (Betrouwbare zwaarte — Groen vest, rode flannel, trucksleutel)
* **Lila Quinn** (Intimiteit op afstand — Koperlok in zwart haar, radio microfoon)
* **Gideon Pike** (Absolute controle — Geschoren hoofd, littekens, kompas)
* **Ruby Cade** (Vuur met discipline — Bordeauxrood leer, koperrood haar)
* **Abel Graves** (Onnatuurlijke stilte — Grijze jas, blauwe sjaal, zakhorloge)

---

## ⚡ 4. Uitvoering via Kie.ai (MCP & CLI)

### A. Foto Generatie (ByteDance Seedream 5 Pro)
```bash
$env:KIE_AI_API_KEY="your-api-key"
npm run kie -- bytedance_seedream_image \
  --prompt "<stijl_prompt_uit_style_presets>" \
  --version 5-pro \
  --aspect_ratio 9:16 \
  --quality high
```

### B. Video Generatie met Audio & Beeldreferentie (ByteDance Seedance 2.5)
> [!NOTE]
> `first_frame_url` en `reference_image_urls` zijn **mutually exclusive** in Seedance 2.5. Gebruik `reference_image_urls` samen met `reference_audio_urls` voor het beste gesynchroniseerde resultaat.

```bash
# 1. Knip audio en verkrijg publieke URL:
node .agents/skills/jackhowlin-social-producer/scripts/snip-audio.js --input "master.wav" --output "snip.mp3" --start "00:00:30" --duration 10
node .agents/skills/jackhowlin-social-producer/scripts/upload-audio.js --input "snip.mp3"

# 2. Start Seedance 2.5 met audio en ankerbeeld:
$env:KIE_AI_API_KEY="your-api-key"
npm run kie -- bytedance_seedance_video \
  --prompt "Cinematic atmospheric 9:16 vertical video. Jack Howlin leans against his vintage black pickup truck on the midnight desert highway..." \
  --reference_image_urls "<seedream_5_pro_still_url>" \
  --reference_audio_urls "<firebase_public_audio_url>" \
  --duration 10 \
  --resolution 720p \
  --aspect_ratio 9:16
```

---

## 🛠️ 4. Lokale Bundled Tooling & Mastering

1. **Audio Knippen met Fades:**
   ```bash
   node .agents/skills/jackhowlin-social-producer/scripts/snip-audio.js \
     --input "projects/hate-me-all-you-want/audio/master-hate-me-all-you-want.wav" \
     --output "projects/hate-me-social-production/hate_me_drop_10s.wav" \
     --start "00:00:30" \
     --duration 10
   ```

2. **Video Muxing met Master Audio & 35mm Grain:**
   ```bash
   node .agents/skills/jackhowlin-social-producer/scripts/mux-social-video.js \
     --video "seedance_raw.mp4" \
     --audio "hate_me_drop_10s.wav" \
     --output "jack_howlin_final.mp4"
   ```

3. **Direct Inplannen in Kalender:**
   ```bash
   node .agents/skills/jackhowlin-social-producer/scripts/schedule-post.js \
     --media "jack_howlin_final.mp4" \
     --caption "Still screaming this every single night on the road. Hate me all you want. The crown stays on. ⚡" \
     --title "Hate Me All You Want — Midnight Highway" \
     --platforms "instagram,tiktok,youtube" \
     --datetime "2026-08-31T19:45:00"
   ```

---

## 📅 5. Finale Review & Kalender Status
Wanneer de gebruiker goedkeuring geeft, voert de agent `schedule-post.js` uit om de post definitief vast te leggen in de Dashboard Content Calendar (`/calendar` via Firestore `posts` collectie).
