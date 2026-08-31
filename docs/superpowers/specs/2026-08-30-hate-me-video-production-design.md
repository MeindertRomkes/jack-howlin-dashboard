# Design Spec: 60-Seconden Videoproductie "Hate Me All You Want" (Jack Howlin)

**Auteur:** Antigravity AI Assistant & Meindert Romkes  
**Datum:** 2026-08-30  
**Doel:** Volledig geautomatiseerde videoproductie via de Higgsfield CLI en Next.js Dashboard voor de eerste 60 seconden van het nummer *"Hate Me All You Want"*.

---

## 1. Doel & Creatieve Richting

* **Nummer:** *Hate Me All You Want* (Jack Howlin) — Duur video: 0:00 tot 1:00 (60 seconden).
* **Doelplatformen:** 9:16 Verticaal (TikTok, Instagram Reels, YouTube Shorts).
* **Thema & Sfeer:** **Studio Performance & Close-up Grit** — Donkere outlaw studio noir, vintage buizenversterkers met gloeiende filaments, vintage chrome microfoon (Shure 55SH-stijl), warme amberkleurige schaduwen en intense performance expressie van Jack.

---

## 2. Scène-indeling & Draaiboek (5 Scènes × 12s)

| Scène | Tijd | Type Shot | Beschrijving & Motion |
|---|---|---|---|
| **Scène 1** | 0:00 - 0:12 | Intro & Hook | Close-up op een vintage tube amp waarvan de gloeilampen oplichten; Jack stapt in het donker met zijn akoestische gitaar naar de vintage microfoon. |
| **Scène 2** | 0:12 - 0:24 | Couplet 1 | Medium shot van Jack die ritmisch aanslaat op zijn gitaar en zingt met rauwe expressie; langzame tracking shot / orbit. |
| **Scène 3** | 0:24 - 0:36 | Pre-Chorus | Intense close-up van Jack's gezicht en vingers op de gitaartoetsen, lichte rooksliert langs het amberkleurige studiolicht. |
| **Scène 4** | 0:36 - 0:48 | Chorus Drop | Dynamische performance shot; Jack zingt vol overgave *"Hate me all you want"*, VU-meters van analoge apparatuur slaan uit in het rood. |
| **Scène 5** | 0:48 - 1:00 | Outro & Fade | Slow pull-back shot terwijl het laatste akkoord naklinkt; Jack kijkt met een rauwe, zelfverzekerde blik in de lens terwijl de studiolichten dimmen. |

---

## 3. Technische Architectuur & Modelselectie

### 3.1 Modellen & Kosten (Optie A)
* **Soul Training:** 10 Core Set foto's van Jack getraind via `higgsfield soul-id create --name "Jack Howlin Cinematic" --soul-cinematic`.
* **Scène Stills:** `text2image_soul_v2` (5 stills × 0.12 credits = **0.6 credits**).
* **Video Rendering:** `veo3_1_lite` (5 clips × 6 credits = **30 credits**).
* **Totaal budget:** ~31 credits (ruim binnen de 200 beschikbare credits).

### 3.2 Geautomatiseerde Pipeline (`scripts/produce-hate-me-video.ts`)
1. **Fase 1 (Download Core Set & Train Soul):**
   - Haalt de 10 Core Set foto's op uit Firebase Storage en slaat ze op in `tmp/production/photos/`.
   - Start Soul training in Higgsfield en wacht op afronding (`higgsfield soul-id wait`).
2. **Fase 2 (Genereer 5 Scène Stills):**
   - Genereert met de getrainde Soul ID 5 unieke, stijlvaste 9:16 stills voor de scènes.
3. **Fase 3 (Render 5 Video Clips):**
   - Rendert 5 videoclips via `veo3_1_lite` met de respektievelijke stills als `--start-image`.
4. **Fase 4 (Audio Snipping & Video Stitching):**
   - Knipt 0:00 - 1:00 van `hate-me-all-you-want.wav`.
   - Stitcht de 5 clips met crossfades en koppelt de high-fidelity audiotrack via FFmpeg / canvas stitcher tot `hate-me-master-60s.mp4`.
5. **Fase 5 (Dashboard & Storage Synchronisatie):**
   - Uploadt de master video naar Firebase Storage (`media_library/`).
   - Maakt een document in Firestore `media_library` en een concept post in `posts`.

---

## 4. Verificatie & Oplevering

* Lokale master video opgeslagen in `tmp/production/hate-me-master-60s.mp4`.
* Direct afspeelbaar en in te plannen in het dashboard op `/studio` en `/calendar`.
