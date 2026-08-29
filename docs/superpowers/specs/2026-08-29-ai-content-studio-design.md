# AI Content Studio — Design Spec

**Datum:** 2026-08-29  
**Status:** Goedgekeurd voor implementatie  
**Project:** Jack Howlin' Command Center

---

## Doel & Context

De AI Content Studio is een nieuwe pijler in het Jack Howlin' Command Center die het genereren van on-brand foto's en video's volledig integreert in de bestaande content workflow. Het systeem combineert:

- Een vaste **Jack Core Set** (referentie-foto's) die automatisch bij elke generatie wordt meegestuurd voor visuele consistentie
- De **Kie API** (Seedream 5 Pro voor foto's, Seedance 2.5 voor video's) als generatie-engine
- Een **Suno Library** met handmatig geüploade WAV-tracks als optionele audio bij video-generatie
- Een **Media Library** als centrale opslag van alle gegenereerde assets
- Directe **integratie in de kalender en 14-dagen release funnel** zodat gegenereerde content aan posts gekoppeld kan worden

---

## Architectuuroverzicht

### Kie API Modellen

| Model | Identifier | Gebruik |
|---|---|---|
| Seedream 5 Pro | `seedream/5-pro-image-to-image` | Foto generatie met referentie-afbeeldingen |
| Seedance 2.5 | `bytedance/seedance-2-5` | Video generatie met referentie-afbeeldingen + audio |

**Flow:** POST createTask -> taskId -> poll recordInfo of wacht op webhook callback.

**Completion strategie:** Kie stuurt een callBackUrl webhook als de generatie klaar is (30s-3min voor video). Een Firebase Function ontvangt de callback en werkt de Firestore kie_jobs record bij. De UI luistert realtime via Firestore onSnapshot.

---

## Data Model

### Firestore Collections (nieuw)

#### kie_jobs/{jobId}
- taskId: string — Kie API taskId
- model: "photo" | "video"
- kieModel: string — exacte model-identifier
- state: "waiting" | "success" | "fail"
- prompt: string
- aspectRatio: string
- resultUrls: string[] — gegenereerde asset URLs (na success)
- linkedPostId?: string — optionele koppeling aan kalender-post
- failMsg?: string
- createdAt: Timestamp
- completedAt?: Timestamp

#### media_library/{assetId}
- url: string — Firebase Storage download URL
- type: "image" | "video"
- prompt: string
- kieJobId: string — referentie naar kie_jobs
- linkedPostId?: string
- createdAt: Timestamp

#### suno_tracks/{trackId}
- name: string — tracknaam
- storageUrl: string — Firebase Storage URL
- publicUrl: string — publieke download URL voor Kie API
- durationSeconds?: number
- createdAt: Timestamp

#### jack_core_set/{photoId}
- label: string — bijv. "desert portrait"
- storageUrl: string — Firebase Storage URL
- publicUrl: string — publieke URL voor Kie API reference_image_urls
- order: number — volgorde (max 10 fotos)
- createdAt: Timestamp

### Firebase Storage Buckets (nieuw)
- jack-core-set/ — referentie-fotos (JPEG/PNG/WebP, max 30MB)
- suno-library/ — WAV uploads (max 15MB per track)
- media-library/ — gegenereerde fotos en videos

---

## API Routes (Next.js)

### POST /api/studio/generate
Maakt een Kie generatie-taak aan. Haalt automatisch de Jack Core Set op uit Firestore en voegt die toe als reference_image_urls. Stuurt callBackUrl mee die wijst naar de Firebase Function.

### GET /api/studio/status/[taskId]
Fallback polling endpoint als de webhook niet aankomt. Proxies naar Kie recordInfo en werkt Firestore bij.

### POST /api/studio/callback
Publieke endpoint (Firebase Function URL) die Kie aanroept bij taakcompleties. Schrijft resultaat naar kie_jobs en maakt een media_library record aan.

### POST /api/studio/upload
Upload-handler voor Jack Core Set fotos en Suno WAV-tracks naar Firebase Storage.

---

## UI Structuur

### 1. Studio Tab — /studio
Nieuwe tab in het dashboard naast de bestaande navigatie.

Subonderdelen:
- Mode toggle: "Foto" / "Video"
- Prompt input: vrije tekst
- Instelling-controls: aspect ratio, kwaliteit/resolutie, duur (video)
- Suno Track Selector: dropdown van beschikbare tracks (optioneel, alleen video)
- Jack Core Set Preview: readonly weergave van de actieve referentie-fotos (auto-meegestuurd)
- Genereer-knop: triggert /api/studio/generate, toont realtime status via Firestore
- Media Library grid: alle gegenereerde assets, met "Aan post koppelen" actie per asset

### 2. Kalender / Release Funnel — Inline integratie
Per geplande post: "Visual genereren" knop die een GenerateModal opent. De songtitel of post-caption wordt automatisch als prompt-suggestie ingevuld. Na generatie wordt het asset direct aan de post gekoppeld (linkedPostId).

### 3. Settings — Twee nieuwe secties

Jack Core Set Manager:
- Upload referentie-fotos (JPEG/PNG/WebP)
- Label per foto
- Volgorde aanpassen
- Verwijderen
- Maximum: 10 fotos

Suno Library Manager:
- Upload WAV-bestanden
- Tracknaam instellen
- Verwijderen

---

## Bestandsstructuur

app/api/studio/generate/route.ts — POST: Kie taak aanmaken
app/api/studio/status/[taskId]/route.ts — GET: fallback status polling
app/api/studio/callback/route.ts — POST: Kie webhook ontvanger
app/api/studio/upload/route.ts — POST: Storage upload handler
app/(dashboard)/studio/page.tsx — Studio tab hoofdpagina
components/studio/GenerateForm.tsx — Foto/video generatie formulier
components/studio/MediaLibrary.tsx — Grid van gegenereerde assets
components/studio/JackCoreSetPreview.tsx — Readonly preview core set
components/studio/SunoTrackSelector.tsx — Dropdown Suno tracks
components/studio/GenerateModal.tsx — Mini-studio vanuit kalender/funnel
components/studio/GenerationStatus.tsx — Realtime status indicator
components/settings/JackCoreSetManager.tsx — Upload/verwijder core set fotos
components/settings/SunoLibraryManager.tsx — Upload/verwijder WAV tracks
functions/src/kieCallback.ts — Firebase Function: webhook handler
lib/kie.ts — Kie API client (createTask, getStatus)
lib/studio.ts — Studio helper functies
types/studio.ts — TypeScript types voor studio entities

---

## Omgevingsvariabelen

KIE_API_KEY=<api_key>
KIE_API_BASE_URL=https://api.kie.ai/api/v1
KIE_CALLBACK_URL=https://<firebase-function-url>/kieCallback

---

## Verificatieplan

### Handmatig (stap voor stap)
1. Upload 2 Jack Core Set fotos in Settings -> verschijnen in Firestore jack_core_set
2. Upload een Suno WAV in Settings -> verschijnt in suno_tracks
3. Open Studio tab -> foto genereren met prompt -> status wordt realtime bijgewerkt -> resultaat verschijnt in Media Library
4. Video genereren met Suno track als audio -> resultaat in Media Library
5. Vanuit kalender een post openen -> "Visual genereren" -> gegenereerd asset gekoppeld aan post
6. Gegenereerd asset in Media Library "Aan post koppelen" -> post heeft visuele referentie
