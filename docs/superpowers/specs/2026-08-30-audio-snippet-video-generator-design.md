# Audio Snippet & 10s AI Video Generator — Design Spec

**Datum:** 2026-08-30  
**Status:** Goedgekeurd na brainstorm  
**Project:** Jack Howlin' Command Center  
**Auteur:** Antigravity & Meindert  

---

## 1. Doel & Context

Het Jack Howlin' Command Center heeft een krachtig vliegwiel:
$$\text{Data \& Trends} \longrightarrow \text{AI Intelligence} \longrightarrow \text{Creatie \& Studio} \longrightarrow \text{Publicatie \& Kalender} \longrightarrow \text{Fan Interactie}$$

Om van muziek, data en AI een naadloze contentmachine te maken voor **TikTok, Instagram Reels en YouTube Shorts**, introduceert deze feature:
1. **Audio Snipper Tool (10-15s):** Direct in het dashboard de beste hooks, drops of refreinen uit geüploade Suno-tracks knippen en beheren.
2. **Twee Video Generatie Vormen:**
   - **Pure AI Cinematics (Kie Seedance 2.5):** Jack Howlin' bewegend in een cinematische 9:16 scène, synchroon met de Jack Core Set en audio.
   - **Dynamic Audiogram / Lyric Reel:** Een AI-foto (Seedream 5 Pro) gecombineerd met een geanimeerde audio-waveform, songtekst/quote overlay en de audio-snippet.
3. **Data-Driven Hook & Caption Engine (Gemini):** Automatisch de ideale video-prompt, caption in Jack's stijl en hashtags genereren op basis van trackdata en sentiment.
4. **Contextuele Ecosysteem Bruggen:** Directe actieknoppen vanuit Analytics en de 14-Dagen Release Launchpad naar de Studio, en met 1 klik vanuit de Media Library inplannen in de Kalender.

---

## 2. Architectuuroverzicht & Gebruikersstroom

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           1. AUDIO BRON & SNIPPER                       │
│  - Suno Library track selectie (WAV/MP3)                                │
│  - Visuele scrubber / waveform selector (bijv. 0:45 - 0:55, 10s)        │
│  - Snippet metadata: Label ("Main Chorus"), Key Lyric Line              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     2. DATA & AI PROMPT / CAPTION ENGINE                │
│  - Gemini leest track metadata, songtekst en analytics inzichten        │
│  - Genereert cinematische visual prompt + Jack Voice caption + tags     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│   3A. AI CINEMATICS (KIE API)     │ │     3B. DYNAMIC AUDIOGRAM REEL    │
│  - Seedance 2.5 video engine      │ │  - Seedream 5 Pro Jack portret    │
│  - Jack Core Set referentie-foto's│ │  - Geanimeerde audio waveform     │
│  - Direct 9:16 MP4 video export   │ │  - Rugged lyric quote overlay     │
└─────────────────┬─────────────────┘ └─────────────────┬─────────────────┘
                  │                                     │
                  └──────────────────┬──────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     4. MEDIA LIBRARY & 1-CLICK POST                     │
│  - Realtime preview van gegenereerde 9:16 clip                          │
│  - Direct koppelen aan post & 1-Click scheduling in Kalender           │
│  - Geschikt voor TikTok, Instagram Reels en YouTube Shorts              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model Uitbreidingen (Firestore)

### 3.1 `suno_tracks/{trackId}` Uitbreiding
Bestaande `SunoTrack` entity wordt uitgebreid met `snippets`:

```typescript
export interface AudioSnippet {
  id: string
  name: string                 // bijv. "Chorus Hook", "Acoustic Intro", "Solo Drop"
  startTime: number            // starttijd in seconden (bijv. 42.5)
  endTime: number              // eindtijd in seconden (bijv. 52.5)
  duration: number             // duur in seconden (bijv. 10.0)
  highlightLyric?: string      // sleutel-tekstregel voor video overlay / quote
  storageUrl?: string          // optionele URL naar geëxporteerde audio snippet
  publicUrl?: string           // download/stream URL
  createdAt: Timestamp
}

export interface SunoTrack {
  id: string
  name: string
  storageUrl: string
  publicUrl: string
  durationSeconds?: number
  createdAt: Timestamp
  releaseType: 'single' | 'album'
  releaseStatus?: 'released' | 'upcoming'
  albumName?: string
  trackNumber?: number
  releaseYear?: number
  albumCoverUrl?: string
  snippets?: AudioSnippet[]    // NIEUW: opgeslagen 10-15s snippets
}
```

### 3.2 `kie_jobs/{jobId}` & `media_library/{assetId}` Uitbreiding

```typescript
export interface KieJob {
  id: string
  taskId: string
  model: 'photo' | 'video'
  videoType?: 'cinematic' | 'audiogram'  // NIEUW
  kieModel: string
  state: 'waiting' | 'success' | 'fail'
  prompt: string
  aspectRatio: string
  resultUrls: string[]
  sunoTrackId?: string                   // NIEUW: gekoppelde track
  snippetId?: string                     // NIEUW: gekoppelde snippet
  captionSuggestion?: string             // NIEUW: gegenereerde caption
  linkedPostId?: string
  failMsg?: string
  createdAt: Timestamp
  completedAt?: Timestamp
}

export interface MediaAsset {
  id: string
  url: string
  type: 'image' | 'video'
  videoType?: 'cinematic' | 'audiogram'  // NIEUW
  prompt: string
  kieJobId: string
  sunoTrackId?: string                   // NIEUW
  snippetId?: string                     // NIEUW
  suggestedCaption?: string              // NIEUW
  linkedPostId?: string
  createdAt: Timestamp
}
```

---

## 4. Componenten & Functionaliteit

### 4.1 Audio Snipper Component (`components/studio/AudioSnipper.tsx`)
- **Visual Scrubber / Waveform:** 
  - Toont de volledige audiotrack met tijdsindicatie en een verstelbaar selectievenster van 5 tot 15 seconden (standaard 10s).
  - Knoppen voor `-1s`, `+1s`, `Start/End` fijnregeling.
  - **Loop Playback:** Speelt continu de geselecteerde snippet af zodat de gebruiker het resultaat hoort vóór generatie.
  - **Opslaan & Beheren:** Snippet opslaan met label en optionele `highlightLyric`.
  - Herbruikbaar in zowel de **Suno Library Manager** (Settings) als direct in de **AI Content Studio**.

### 4.2 AI Studio Uitbreiding (`components/studio/GenerationForm.tsx` & `AudiogramGenerator.tsx`)
- **Modus Keuze:**
  1. **Foto** (Seedream 5 Pro)
  2. **AI Video** (Seedance 2.5 + Jack Core Set + Audio Snippet)
  3. **Audiogram / Lyric Reel** (Seedream portret + Waveform Canvas overlay + Audio Snippet)
- **Track & Snippet Selector:**
  - Kies track $\rightarrow$ Direct kiezen uit bestaande snippets of ter plekke knippen via de inline Audio Snipper.
- **Gemini Magic Assistant (Prompt & Caption Generator):**
  - Knop: `[⚡ AI Prompt & Caption bedenken]`
  - Gemini gebruikt tracktitel, genre, lyric line en Jack's tone of voice om in één klik een cinematische prompt én post-caption voor te stellen.

### 4.3 Contextuele Ecosysteem Koppelingen (De Lijm)
1. **Analytics (`app/(dashboard)/analytics/page.tsx`):**
   - Naast elke toptrack in de tabel / momentum radar: een knop `[🎬 Maak 10s Clip]` die de Studio opent met die track en context voorgeselecteerd.
2. **Release Launchpad (`components/calendar/SongReleaseLaunchpadModal.tsx`):**
   - Bij teaser-posts (bijv. Dag -5 en Dag -2): een directe knop `[⚡ Genereer 10s Teaser Video]` die het studio-modal triggert.
3. **Media Library (`components/studio/MediaLibrary.tsx`):**
   - Bij elke video asset: een directe knop `[📅 Inplannen]` die een planning-modal opent met de gegenereerde caption, video-link en kanaal-selectie (TikTok, Reels, Shorts).

---

## 5. API Routes

### 5.1 `POST /api/studio/snippets`
- Opslaan, bijwerken of verwijderen van een `AudioSnippet` op een `suno_tracks` document.
- Valideert start/eindtijden en berekent duur.

### 5.2 `POST /api/studio/prompt-generator`
- Invoer: `trackTitle`, `lyricLine`, `videoType`, `targetPlatform`.
- Aanroep naar Gemini Flash / Pro met Jack Howlin' Persona context.
- Uitvoer: `{ prompt: string, caption: string, hashtags: string[] }`.

### 5.3 `POST /api/studio/audiogram`
- Render-endpoint voor audiogram/lyric video's die de gegenereerde AI achtergrondafbeelding combineert met audio waveform visualisatie en tekst overlay naar een 9:16 MP4.

---

## 6. Verificatieplan

### 6.1 Geautomatiseerde Tests
- **Unit & Integratie tests (`vitest run`):**
  - `tests/lib/studio-snippets.test.ts`: Testen van Firestore CRUD operaties voor audio snippets.
  - `tests/api/prompt-generator.test.ts`: Testen van Gemini prompt & caption generatie endpoint.
  - `tests/components/AudioSnipper.test.tsx`: Testen van waveform tijdsberekening en start/end markers.

### 6.2 Handmatige Verificatie
1. **Suno Snipper:** Open Settings $\rightarrow$ Suno Library $\rightarrow$ Open een track $\rightarrow$ Knip 10s snippet $\rightarrow$ Opslaan $\rightarrow$ Verifieer loop playback.
2. **Studio Generatie:**
   - Genereer AI Cinematics video met gekozen 10s snippet.
   - Genereer Dynamic Audiogram met lyric regel.
3. **Ecosysteem Flow:**
   - Klik vanuit Analytics op een toptrack `[🎬 Maak 10s Clip]` $\rightarrow$ Studio opent met track geladen.
   - Video klaar in Media Library $\rightarrow$ Klik `[📅 Inplannen]` $\rightarrow$ Post staat direct in de Kalender.
