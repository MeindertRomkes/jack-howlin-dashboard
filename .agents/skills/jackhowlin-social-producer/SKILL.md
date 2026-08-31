---
name: jackhowlin-social-producer
description: Use when creating, brainstorming, producing, or scheduling social media content (photos, videos, reels, shorts, captions, and campaign packs) for Jack Howlin using Kie.ai (Seedream 5 Pro, Seedance 2.5) and the canonical Jack Core Set.
---

# Jack Howlin Social Producer

## 🤠 Overview
De **Jack Howlin Social Producer** is de interactieve creatieve en strategische engine voor het produceren van hoogwaardige social media posts en videocontent voor Outlaw Country-Rock artiest **Jack Howlin**.

De skill bewaakt 100% gezichts- en kledingconsistentie via de **Jack Core Set**, integreert **ByteDance Seedream 5 Pro** en **Seedance 2.5** via Kie.ai, adviseert op basis van historische dashboard analytics, en plant goedgekeurde posts in op de contentkalender.

---

## 🧭 Wanneer te gebruiken
* De gebruiker wil een post, video, reel of TikTok maken voor Jack Howlin (*"Ik wil iets op socials plaatsen"* of *"Maak een nieuwe video voor socials"*).
* Brainstormen over concepten, stijlkeuzes, audiofragmenten en captions.
* Produceren van video's met vocale lip-sync OF stoïcijnse sfeerbeelden (niet-zingend).
* Genereren van single posts of wekelijkse 3-tot-5 post campagnepakketten.

---

## 📋 De Interactieve Brainstorm- & Productie Flow

```
┌───────────────────────────┐
│ 1. Brainstorm & Advies    │◄── Vraag formaat, doel, platform & stijl (3 presets)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 2. Data & Audio Selectie  │◄── Koppel top-retentie hook & audiofragment
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 3. Core Set Koppeling     │◄── Injecteer Jack Core Set referentie-URLs
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 4. Kie.ai Generatie       │◄── Seedream 5 Pro (foto) / Seedance 2.5 (video)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 5. Mastering & Fallback   │◄── Audio sync via FFmpeg (lossless fades + grain)
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ 6. Goedkeuring & Kalender │◄── Finale review en planning via /api/posts
└───────────────────────────┘
```

---

## 💬 1. De Consultatievragen (Stap voor Stap)

Vraag de gebruiker gericht naar de gewenste insteek en presenteer concrete opties:

1. **Formaat & Type:**
   * Foto (Seedream 5 Pro) of Video (Seedance 2.5)?
   * Aspect Ratio: `9:16 Vertical` (Reels/TikTok), `1:1 Square` (Feed), of `16:9 Landscape`.
2. **Data-Gedreven Suggesties (Dashboard Analytics):**
   * Raadpleeg `references/data-intelligence-matrix.md` en deel relevante trends (bijv. *"Highway visuals met de bas-drop scoren momenteel 84% retentie"*).
3. **Muziek & Fragment:**
   * Welke track uit Jack's catalogus (*Hate Me All You Want*, *I Still Wear This Crown*, *Whiskey & Rust*)?
   * Welk fragment (Intro Hook, Verse Build, Chorus Drop, Acoustic Outro)?
4. **Vocal Performance Modus:**
   * **A-Roll Lip-Sync:** Jack zingt de tekst met expressieve mond- en gitaarbewegingen.
   * **Atmospheric Mood (Niet zingen):** Jack zwijgt stoïcijns (mond dicht), subtiele ademhaling, wind in haar/jas, intense blik in de lens.
5. **Visuele Stijlpresets:**
   * Presenteer de 3 uitgewerkte presets uit `references/style-presets.md`:
     1. **Midnight Highway Noir:** Mistige nachtweg, vintage truck, verre neon diner gloed.
     2. **Dark Studio Analog:** Warme amberkleurige buizenversterkers, Shure 55SH microfoon.
     3. **Outlaw Saloon Grit:** Donkere tavern, kerosinelamp, whiskey & gitaarkoffer.
6. **On-Screen Hook, Caption & Merch CTA:**
   * Schrijf 2 caption varianten conform `references/brand-voice.md`.

---

## 🎨 2. Jack Core Set Referentie Binding

> [!IMPORTANT]
> Genereer Jack Howlin **NOOIT** blind via text-to-image. Gebruik altijd de officiële **Jack Core Set** beelden als image reference URLs (`projects/hate-me-seedance-30s/stills/jack-howlin-master-still.png` of de Cloud Storage URLs).

### Vaste Wardrobe Anchors in Prompts:
* `wearing a tan camel-brown heavy canvas work jacket with dual front chest flap pockets`
* `over an unbuttoned charcoal grey cotton henley shirt`
* `full rugged brown beard and mustache, chiseled masculine jawline, wavy brown hair`

---

## ⚡ 3. Uitvoering via Kie.ai (MCP & CLI)

### A. Foto Generatie (ByteDance Seedream 5 Pro)
```bash
$env:KIE_AI_API_KEY="your-api-key"
npm run kie -- bytedance_seedream_image \
  --prompt "<stijl_prompt_uit_style_presets>" \
  --image_urls "<jack_core_set_url>" \
  --version 5-pro \
  --aspect_ratio 9:16 \
  --quality high
```

### B. Video Generatie (ByteDance Seedance 2.5)
```bash
$env:KIE_AI_API_KEY="your-api-key"
npm run kie -- bytedance_seedance_video \
  --prompt "<video_prompt_uit_style_presets>" \
  --first_frame_url "<seedream_still_url>" \
  --reference_image_urls "<jack_core_set_url>" \
  --duration 10 \
  --resolution 720p
```

---

## 🛠️ 4. Lokale Bundled Tooling & Mastering

De skill beschikt over ingebouwde scripts voor directe bewerking:

1. **Audio Knippen met Fades:**
   ```bash
   node .agents/skills/jackhowlin-social-producer/scripts/snip-audio.js \
     --input "projects/hate-me-all-you-want/audio/master-hate-me-all-you-want.wav" \
     --output "projects/hate-me-social-visualizer/audio_snip.wav" \
     --start "00:00:30" \
     --duration 15
   ```

2. **Video & Audio Muxing (met Smart Fallback):**
   ```bash
   # Modus A: Video + Audio Muxing
   node .agents/skills/jackhowlin-social-producer/scripts/mux-social-video.js \
     --video "raw_seedance.mp4" \
     --audio "audio_snip.wav" \
     --output "final_social.mp4"

   # Modus B: 2.5D Geanimeerde Parallax Fallback (bij ontoereikend videosaldo)
   node .agents/skills/jackhowlin-social-producer/scripts/mux-social-video.js \
     --image "still_seedream5.jpg" \
     --audio "audio_snip.wav" \
     --output "final_social_fallback.mp4" \
     --duration 15
   ```

---

## 📅 5. Finale Review & Kalender Planning

1. Toon het eindresultaat aan de gebruiker:
   * **Beeld/Video Preview:** Lokale bestandslocatie.
   * **Audio Segment:** Tijdcode en tracktitel.
   * **Gekozen Caption & Hashtags.**
   * **Voorgestelde Publicatiedatum & Tijd (CET Prime Time).**
2. Vraag expliciete goedkeuring van de gebruiker.
3. Plan de post in via de Dashboard Content Calendar (`/calendar` via `POST /api/posts`).
