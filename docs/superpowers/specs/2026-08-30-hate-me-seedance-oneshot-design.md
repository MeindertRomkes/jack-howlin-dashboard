# Design Spec: 30-Seconden Seedance 2.5 One-Shot Lip-Sync "Hate Me All You Want" (Jack Howlin)

**Auteur:** Antigravity AI Assistant & Meindert Romkes  
**Datum:** 2026-08-30  
**Status:** Approved by User  
**Doel:** Volledig geautomatiseerde videoproductie van een hyper-gedetailleerde 30-seconden continuous one-shot muziekvideo met vocale lip-sync voor Jack Howlin (*"Hate Me All You Want"*).

---

## 1. Creatieve Visie & Setting

* **Nummer & Segment:** *Hate Me All You Want* (Jack Howlin) — Chorus Drop Climax (Tijdcode: 0:30 tot 1:00 van de master track).
* **Formaat:** 9:16 Verticaal (Geoptimaliseerd voor TikTok, Instagram Reels en YouTube Shorts).
* **Thema:** **Dark Studio Noir & Raw Outlaw Grit** — Donkere analoge studio met houten wanden, gloeiende 6L6 buizen van vintage versterkers, enkele vintage chrome Shure 55SH microfoon op een rechte standaard, amberkleurige rim lighting en atmosferische rook/nevel.
* **Karakter & Wardrobe:** Jack Howlin (Outlaw Country Rock frontman), ruige volle bruine baard, golvend haar, tan camel-brown zware canvas werkjas met borstzakken over een losgeknoopte antracietkleurige henley, weathered sunburst akoestische gitaar.

---

## 2. Technische Architectuur & Modelselectie

### 2.1 Model Pipeline
1. **Master Reference Still:** **Seedream 5.0 / Soul Cinematic** (`soul_cinematic` met Soul ID `a31fae2f-897d-416c-94e5-a0b0b90e0f45`).
   * Genereert een haarscherp, fotorealistisch 9:16 ankerbeeld in 2K met 85mm f/1.4 lenskarakteristiek en exacte studiobelichting.
2. **Video & Performance Generatie:** **Seedance 2.5** (`seedance_2_5` in `omni_reference` mode).
   * Input: Seedream 5.0 still als `--start-image`, 30s audio snippet als `--audio`, en de gedetailleerde prompt met timestamps en lyric cues.
   * Levert een 30-seconden ononderbroken shot met dynamische spier-, kaak-, nek- en gitaarbewegingen, synchroon op de zang.
3. **Audio Extraction & Master Stitching:** **FFmpeg**.
   * Knipt lossless 30s PCM WAV (0:30 - 1:00) uit de master track `hate-me-all-you-want.wav`.
   * Remuxt en aligneert de video met de ongecomprimeerde stereo audiotrack.
4. **Cloud Synchronisatie:** **Firebase Storage & Firestore**.
   * Uploadt master MP4 naar `media_library/` en registreert het asset in de database voor het Dashboard (`/studio` en `/calendar`).

---

## 3. Uitgewerkte Prompts & Tijdcode Mapping

### 3.1 Seedream 5.0 Still Prompt
```text
Cinematic 35mm anamorphic film portrait, 9:16 vertical. Jack Howlin, a rugged outlaw country-rock singer with a full groomed brown beard and wavy dark brown hair, wearing a tan heavy canvas work jacket with dual front flap pockets over an unbuttoned charcoal grey henley shirt. He is standing center-frame in a dark, atmospheric analog recording studio, stepping up to a single vintage chrome Shure 55SH microphone on a straight stand. He holds a weathered sunburst acoustic guitar. Warm amber and tungsten rim lighting accents his profile and beard, soft volumetric haze and glowing vacuum tube amplifiers in the soft-focus dark background. Photorealistic, hyper-detailed skin texture, realistic reflections on the chrome microphone, master studio cinematography, 85mm f/1.4 lens.
```

### 3.2 Seedance 2.5 Video Prompt (Met Timestamps & Lyrics)
```text
One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin delivering an intense, raw vocal performance in a dark studio noir setting, perfectly lip-synced to the vocal track.

• [00:00 - 00:07] [Intro & Verse Build]: (Lyrics: 'You can talk your talk, leave your dirt on my name...') Medium shot. Jack Howlin leans slightly into the vintage chrome Shure 55SH microphone, strumming his acoustic guitar rhythmically. Natural realistic mouth and jaw movements in sync with the lyrics, focused, steady outlaw gaze into the mic.

• [00:07 - 00:15] [Pre-Chorus Rise]: (Lyrics: 'Go ahead and draw your line in the sand...') The camera performs a slow, continuous cinematic push-in toward Jack. His performance grows more energetic, facial muscles tightening with emotional defiance, vocal delivery syncing seamlessly with every gravelly syllable.

• [00:15 - 00:23] [Chorus Drop Climax]: (Lyrics: 'So hate me all you want! I was born in the fire, rising up through the dust!') Tight dramatic close-up on Jack Howlin belting out the chorus with full power directly into the microphone. Expressive lip-sync, subtle head tilt, warm amber rim lighting catching his jawline and flying dust motes, heavy acoustic guitar chords struck in tempo.

• [00:23 - 00:30] [Resonance & Outro Smirk]: (Lyrics: '...hate me all you want!') Slow deceleration of camera movement. Jack finishes the vocal line, exhales softly with a confident outlaw smirk, looks straight into the camera lens as the final guitar chord reverberates, and the amber studio lights slowly fade to dark shadows.

Unbroken camera move, authentic mouth lip-sync, zero morphing, consistent lighting, realistic facial physics and guitar playing.
```

---

## 4. Productie- & Testplan

1. **Audio Voorbereiding:** `projects/hate-me-oneshot/audio/hate-me-30s-chorus.wav` knippen met FFmpeg.
2. **Generatie Still:** Uitvoeren via de Higgsfield CLI met Soul ID en validatie van gezichts- en studiokwaliteit.
3. **Generatie Video:** Aanroepen van Seedance 2.5 met omni-reference modus en audio synchronisatie.
4. **Final Mastering & Upload:** Remuxen tot `hate-me-seedance-30s-master.mp4` en uploaden naar Firebase.
5. **Dashboard Verificatie:** Controleren van afspeelbaarheid en metadata in de Next.js Studio.
