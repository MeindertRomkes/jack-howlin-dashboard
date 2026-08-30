# Multi-Scene Storyboarder & Video Stitcher — Design Spec

**Datum:** 2026-08-30  
**Status:** Goedgekeurd voor planning  
**Project:** Jack Howlin' Command Center  
**Auteur:** Antigravity & Meindert  

---

## 1. Doel & Context

Moderne social media video's (TikTok, Instagram Reels, YouTube Shorts) van 20 tot 60 seconden hebben dynamiek nodig: wisselende camerastandpunten (cuts) elke 6 tot 12 seconden verhogen de retentie enorm. Tegelijkertijd hebben AI-videomodellen (zoals Kie Seedance 2.5) een maximale generatieduur per take (5 tot 30s).

Dit subsysteem breidt de AI Content Studio uit met een **Multi-Scene Storyboarder & Video Stitcher**:
1. **Vrije Snippet Duur:** Geen 10-seconden limiet meer — kies flexibel elke duur tussen 5 en 60+ seconden (bijv. 37s).
2. **Gemini AI Scene Director:** Analyseert de geselecteerde tijdsduur, tempo en songtekst en stelt automatisch 2 tot 5 logische filmscènes voor met gevarieerde shots (Wide, Driving, Close-up, Climax).
3. **Visuele Continuïteit & First-Frame Chaining:** Garandeert dat Jack er in elke scène identiek uitziet via de Jack Core Set en chaining van referentieframes.
4. **Automatische Video Stitcher:** Voegt alle gegenereerde scène-videobestanden samen tot **één complete Master MP4-video** met het ononderbroken Suno audiospoor eronder.
5. **1-Click Post:** Het eindresultaat verschijnt direct in de Media Library en kan met 1 klik ingepland worden in de Kalender.

---

## 2. Architectuuroverzicht & Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    1. AUDIO SNIPPER (Bijv. 37 seconden)                      │
│  - Selecteer willekeurige tijdsduur (bijv. 0:25 - 1:02 = 37s)                 │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  2. GEMINI AI SCENE DIRECTOR (STORYBOARDER)                  │
│  - Splitst 37s in bijv. 3 scènes:                                            │
│    * Scène 1 (12s): Wijde hoek — Jack bij vintage truck in Nevada zonsondergang │
│    * Scène 2 (15s): Medium shot — Jack rijdend over Route 66, sigarettenrook    │
│    * Scène 3 (10s): Close-up — Jack met gitaar voor neon saloon                 │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│  Kie Task 1 (Scène 1)  │ │  Kie Task 2 (Scène 2)  │ │  Kie Task 3 (Scène 3)  │
│  Seedance 2.5 (12s)    │ │  Seedance 2.5 (15s)    │ │  Seedance 2.5 (10s)    │
│  + Jack Core Set       │ │  + Jack Core Set       │ │  + Jack Core Set       │
└───────────┬────────────┘ └───────────┬────────────┘ └───────────┬────────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    3. VIDEO STITCHER & AUDIO MULTIPLEXER                     │
│  - Concateneert Scène 1.mp4 + Scène 2.mp4 + Scène 3.mp4                      │
│  - Multiplext de originele master 37s Suno audiotrack over de hele tijdlijn  │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  4. MASTER ASSET IN MEDIA LIBRARY & KALENDER                 │
│  - Eén complete 37s 9:16 vertical video                                      │
│  - 1-Click scheduling naar TikTok, Reels en Shorts                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model Uitbreidingen (Firestore)

### 3.1 `storyboard_jobs/{jobId}` (Nieuwe Collection)
```typescript
export interface StoryboardScene {
  index: number
  duration: number               // bijv. 12 (seconden)
  shotType: 'wide' | 'medium' | 'closeup' | 'drone' | 'pov'
  prompt: string                 // visuele prompt voor deze specifieke take
  cameraMotion?: string          // bijv. "Slow tracking shot left to right"
  taskId?: string                // Kie API taskId voor deze scène
  state: 'waiting' | 'generating' | 'success' | 'fail'
  resultVideoUrl?: string        // MP4 URL van deze individuele scène
}

export interface StoryboardJob {
  id: string
  sunoTrackId?: string
  snippetId?: string
  totalDuration: number          // totale lengte (bijv. 37s)
  aspectRatio: string            // '9:16'
  audioUrl: string               // master audio snippet URL
  scenes: StoryboardScene[]      // array van 2 tot 5 scènes
  state: 'storyboarding' | 'rendering_scenes' | 'stitching' | 'success' | 'fail'
  masterResultUrl?: string       // finale samengevoegde 9:16 MP4 URL
  captionSuggestion?: string
  linkedPostId?: string
  failMsg?: string
  createdAt: Timestamp
  completedAt?: Timestamp
}
```

---

## 4. Componenten & Functionaliteit

### 4.1 Audio Snipper Upgrade (`components/studio/AudioSnipper.tsx`)
- Uitbreiding van maximale selectielengte van 30s naar **60s+**.
- Directe weergave van het aantal geadviseerde scènes:
  - $\le 15\text{s}$: 1 take (Single Scene)
  - $16 - 30\text{s}$: 2 scènes (Dual Shot)
  - $31 - 45\text{s}$: 3 scènes (Multi-Scene Storyboard)
  - $46 - 60\text{s}$: 4 scènes (Full Reel Experience)

### 4.2 Storyboard Director Interface (`components/studio/StoryboardDirector.tsx`)
- **Tijdlijn & Scène-blokken:** Visuele weergave van de scènes op een balk (bijv. `[ Scène 1: 12s ] [ Scène 2: 15s ] [ Scène 3: 10s ]`).
- **Scène Kaarten:**
  - Shot type badge (Wide, Medium, Close-up).
  - Bewerkbare scène-prompt.
  - Camera-beweging selector (Dolly forward, Pan right, Static cinematic, Handheld gritty).
- **Gemini Regenerate Scene:** Knop om een individuele scène opnieuw te laten bedenken als je een shot wilt aanpassen.
- **Generate Storyboard Knop:** Start de parallelle / sequentiële generatie van alle scènes.

### 4.3 Realtime Storyboard Renderer (`components/studio/StoryboardProgress.tsx`)
- Toont de voortgang per scène (bijv. `Scène 1: Gereed ✓`, `Scène 2: Genereren... 60%`, `Scène 3: Wachten...`).
- Toont de stap `🎬 Video's samenvoegen & audio masteren...`.
- Zodra gereed: toont direct de video player met de voltooide 37s Master MP4.

### 4.4 Video Stitcher Engine (`/api/studio/stitch`)
- Ontvangt de lijst van voltooide scène-video URLs en de master Suno audio URL.
- Voegt de videoclips naadloos samen en legt het ononderbroken master audiospoor eronder.
- Slaat de resulterende Master MP4 op in Firebase Storage (`media-library/`) en Firestore.

---

## 5. API Routes

### 5.1 `POST /api/studio/storyboard/suggest`
- **Invoer:** `{ trackTitle, snippetDuration, highlightLyric, mood, targetPlatform }`
- **Gemini Engine:** Berekent de ideale scène-opdeling en levert een array van `StoryboardScene` objecten met gevarieerde cinematische Outlaw Americana camerastandpunten.
- **Uitvoer:** `{ scenes: StoryboardScene[], caption: string, hashtags: string[] }`

### 5.2 `POST /api/studio/storyboard/create`
- **Invoer:** `{ scenes, audioUrl, totalDuration, aspectRatio, captionSuggestion }`
- Maakt een `storyboard_jobs` record aan en lanceert de Kie generatietaken.

### 5.3 `POST /api/studio/stitch`
- Handelt het samenvoegen van de voltooide scènes en de audio track af naar de definitieve Master MP4.

---

## 6. Verificatieplan

### 6.1 Geautomatiseerde Tests (`vitest run`)
- `tests/api/storyboard-suggest.test.ts`: Testen van Gemini scène-verdeling op basis van willekeurige duur (bijv. 37s $\rightarrow$ 3 scènes).
- `tests/components/StoryboardDirector.test.tsx`: Testen van scène-tijdlijn, promptbewerkingen en render-dispatch.
- `tests/lib/storyboard-firestore.test.ts`: Testen van Firestore schema en state transitions.

### 6.2 Handmatige Verificatie
1. Knip een 37-seconden audio snippet in de Suno Library / Studio.
2. Klik op `[🎬 Multi-Scene Storyboard Genereren]`.
3. Controleer dat Gemini 3 verschillende shots voorstelt (Wide, Medium, Close-up) die samen exact 37s zijn.
4. Lanceer de generatie en verifieer de realtime voortgang per scène.
5. Verifieer dat de Master Video naadloos afspeelt met de continue 37s audio eronder.
6. Plan de 37s video in 1 klik in voor TikTok/Instagram Reels.
