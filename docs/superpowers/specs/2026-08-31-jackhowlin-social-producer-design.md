# Design Spec: Jack Howlin Social Producer Skill (`jackhowlin-social-producer`)

**Auteur:** Antigravity AI Assistant & Meindert Romkes  
**Datum:** 2026-08-31  
**Status:** Approved by User  
**Doel:** Bouw een interactieve, end-to-end Social Media Production & Strategy Skill voor Jack Howlin. De skill begeleidt het brainstormproces, forceert 100% gezichtsconsistentie via de Jack Core Set, genereert 4K foto's (Seedream 5 Pro) en video's (Seedance 2.5) via Kie AI, mixt audio, en plant goedgekeurde posts direct in de Dashboard Content Calendar.

---

## 1. Doelstellingen & Kernprincipes

1. **Interactieve Co-Creatie & Brainstorming:** De skill stelt gerichte vragen over mediaformaat, platforms, muziekkeuze, audiofragment, zangmodus (lip-sync vs stoïcijns stil), stijlpresets, en captions.
2. **Data-Gedreven Advies:** Suggesties worden gevoed door historische Dashboard Analytics (bijv. highway visual + bass-drop = 84% retentie).
3. **100% Jack Core Set Consistentie:** Nooit blinde text-to-image generatie van Jack Howlin; altijd automatische koppeling met de officiële Jack Core Set referentiebeelden.
4. **Kie.ai Engine Ecosysteem:**
   * **Foto's:** ByteDance Seedream 5 Pro (`bytedance_seedream_image --version 5-pro` met Jack Core Set image references).
   * **Video's:** ByteDance Seedance 2.5 (`bytedance_seedance_video` met `--first_frame_url`, `--reference_image_urls`, `--duration`).
5. **Outlaw Americana Persona & Tone of Voice:** Geen corporate AI-clichés; rauwe, directe, trotse en uitdagende teksten (*defiance*).
6. **Multi-Asset Campagnes & Directe Kalender Planning:** Mogelijkheid om single posts of wekelijkse 3-tot-5 post packs te genereren, te reviewen en via `/api/posts` in te plannen in de kalender.

---

## 2. Interactieve Brainstorm & Consultatie Flow

Wanneer de gebruiker de skill triggert (bijv. *"Ik wil een post maken voor Jack"* of *"Maak een video voor socials"*), doorloopt de skill de volgende consultatiefasen:

```
[1. Formaat & Platform] ──► [2. Data Insights & Muziek] ──► [3. Performance Mode] ──► [4. Stijl & Copywriting] ──► [5. Kie AI Generatie] ──► [6. Review & Inplannen]
```

### 2.1 Vragen & Keuzemogelijkheden
1. **Media Type & Aspect Ratio:**
   * `9:16 Vertical` (TikTok, Instagram Reels, YouTube Shorts)
   * `1:1 Square` (Instagram Feed, Facebook)
   * `16:9 Landscape` (YouTube, X / Twitter)
   * `4:5 Portrait` (Instagram Feed)
2. **Data Intelligence Suggestie:**
   * Haalt actuele inzichten op: "Highway visuals met *Hate Me All You Want* bass-drop scoren momenteel 84% retentie."
3. **Muziek & Audio Keuze:**
   * Track selectie uit catalogus (*Hate Me All You Want*, *I Still Wear This Crown*, *Whiskey & Rust*, *Desert Rain*, etc.).
   * Snippet selectie (Intro Hook, Verse Build, Chorus Drop, Guitar Solo, Outro Fade).
4. **Vocal / Performance Mode:**
   * **A-Roll Vocal Lip-Sync:** Jack zingt de tekst synchroon met expressieve mond- en kaakbewegingen.
   * **Atmospheric Outlaw Mood (Niet zingen):** Jack is stil (mond gesloten), ademt rustig, wind in haar/jas, intense stoïcijnse blik in de lens, omgevingsmist en neonlichten.
5. **3 Visuele Stijlpresets (+ Custom Optie):**
   * **Preset 1 — Midnight Highway Noir:** Pick-up truck langs verlaten weg, nachtmist, verre neon diner gloed, koude nachtlucht met warm tegenlicht.
   * **Preset 2 — Dark Studio Analog:** Warme amberkleurige studio, gloeiende 6L6 buizenversterkers, vintage Shure 55SH microfoon, zwevende studio haze.
   * **Preset 3 — Outlaw Saloon Grit:** Donkere houten bar/tavern, kerosinelampen, ruige textuur, zware schaduwen en reflecties.
6. **On-Screen Hook, Caption & Merch/Streaming CTA:**
   * Genereert 2 caption varianten (korte punchy hook vs. storytelling quote) in Jack's authentieke outlaw tone-of-voice.
   * Optie voor directe merchandising link (*Hate Me All You Want Hoodie*, *I Still Wear This Crown Cap*) of Spotify Pre-Save.

---

## 3. Technische Architectuur

### 3.1 Skill Bestandsstructuur
```
.agents/skills/jackhowlin-social-producer/
├── SKILL.md                          # Hoofdinstructies, flows en beslisbomen
├── references/
│   ├── brand-voice.md                # Outlaw Americana persona, verboden woorden, wardrobe guide
│   ├── style-presets.md              # Uitgewerkte prompts voor alle stijlen en video modes
│   └── data-intelligence-matrix.md  # Historische performance trends & hook templates
└── scripts/
    ├── snip-audio.js                 # Lossless audio clipper met automatische in/uit-fades (FFmpeg)
    ├── mux-social-video.js           # Remuxer voor video + audio + 35mm grain + faststart MP4
    └── schedule-post.js              # Directe koppeling met Dashboard /api/posts kalender
```

### 3.2 Kie.ai Generatie Pipeline
1. **Core Set Referentie Injectie:**
   * Haalt lokale/cloud URLs op van de Jack Core Set master foto's.
2. **Seedream 5 Pro (Foto's):**
   * CLI: `npm run kie -- bytedance_seedream_image --prompt "..." --image_urls <core_set_urls> --version 5-pro --aspect_ratio 9:16 --quality high`
3. **Seedance 2.5 (Video's):**
   * CLI: `npm run kie -- bytedance_seedance_video --prompt "..." --first_frame_url <seedream_still_url> --reference_image_urls <core_set_urls> --duration 10 --resolution 720p`
4. **Smart Fallback:**
   * Indien video-credits op zijn, rendered `mux-social-video.js` automatisch een 4K 2.5D parallax push-in video van het Seedream 5 ankerbeeld met lossless audio.

---

## 4. Test- & Verificatieplan

1. **Frontmatter & SDO Validatie:** `SKILL.md` voorzien van geldige YAML frontmatter en concrete triggers.
2. **Core Set Injectie Test:** Verifiëren dat de scripts en prompts de Jack Core Set correct aanroepen.
3. **Audio-Snip & Muxing Test:** Uitvoeren van `snip-audio.js` en `mux-social-video.js` met `ffmpeg-static`.
4. **Consultatie Simulatie:** Testen van de interactieve flow van brainstorm tot finale kalender preview.
