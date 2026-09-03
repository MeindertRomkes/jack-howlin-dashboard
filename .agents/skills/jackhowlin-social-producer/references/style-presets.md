# Jack Howlin — Style Presets & Prompt Engineering Guide

> [!IMPORTANT]
> **OFFICIËLE MULTI-LEVEL MASTER REFERENTIE (VERPLICHT):**
> Gebruik voor alle toekomstige Jack Howlin foto- en videoproducties **UITSLUITEND** deze enkele multi-level referentie i.p.v. de oude losse core set foto's:
> * **Lokaal projectbestand:** `projects/jack-core-set/jack_howlin_multilevel_reference.jpg`
> * **Cloud URL:** `https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fjack_howlin_multilevel_reference.jpg?alt=media&token=f1a7ae6e-507d-41b6-97db-71305e38484a`
>
> *(Dit garandeert maximale gezichts- en kledingconsistentie in 1 bestand en houdt het creditverbruik op het absolute minimum)*.

## 🎨 1. De Drie Standaard Stijlpresets


### Preset 1: Midnight Highway Noir
* **Sfeer:** Koude nachtmist, verlaten tweebaanswegen, pick-up truck, warme neon diner reflecties en koplamp-gloed in de verte.
* **Seedream 5 Pro Image Prompt:**
  ```text
  Cinematic 35mm film photograph, 9:16 vertical. Jack Howlin, 35-year-old outlaw country rocker, full rugged brown beard and mustache, wavy dark brown hair, intense piercing gaze, mouth closed, leaning against a vintage black pickup truck on a misty midnight desert highway under distant glowing neon diner lights, wearing tan camel-brown canvas work jacket with chest flap pockets over unbuttoned charcoal grey henley shirt, warm amber rim lighting, cold blue night haze, photorealistic, 85mm f/1.4 lens, shallow depth of field.
  ```
* **Seedance 2.5 Video Prompt (Non-Singing Mood):**
  ```text
  Cinematic atmospheric video in 9:16 vertical. Jack Howlin stands stoically beside the vintage pickup truck on the midnight highway. Jack is not singing, mouth remains closed, subtle slow breathing with intense outlaw gaze into the lens, gentle night breeze blowing his hair and canvas jacket, drifting road mist, slow camera push-in with warm anamorphic lens flare from distant neon lights, 35mm film texture.
  ```

---

### Preset 2: Dark Studio Analog
* **Sfeer:** Warme analoge opnamestudio met houten panelen, gloeiende 6L6 vacuümbuizen van Fender versterkers, vintage Shure 55SH microfoon en zwevende amberkleurige studio-haze.
* **Seedream 5 Pro Image Prompt:**
  ```text
  Cinematic 35mm film photograph, 9:16 vertical. Jack Howlin standing center frame in a dark rustic analog recording studio, stepping in front of a vintage chrome Shure 55SH microphone on a straight vertical stand, holding a sunburst acoustic guitar. Wearing a tan camel-brown canvas work jacket over an unbuttoned charcoal grey henley shirt, full rugged brown beard, wavy hair, intense defiant expression. Glowing orange vacuum tube amplifiers in the soft-focus dark background, warm amber rim lighting, studio smoke haze, 85mm f/1.4 master cinematography.
  ```
* **Seedance 2.5 Video Prompt (Lip-Sync Singing):**
  ```text
  Cinematic performance video in 9:16 vertical. Jack Howlin delivers an intense vocal performance directly into the vintage chrome microphone, singing passionately with authentic mouth and jaw lip-sync in sync with the song rhythm. Acoustic guitar in hand, amber studio lights pulsing subtly, floating dust particles, smooth cinematic camera orbit.
  ```

---

### Preset 3: Outlaw Saloon Grit
* **Sfeer:** Donkere verweerde houten bar/saloonhoek, brandende kerosinelampen, zware schaduwen, gitaarkoffer en whiskeyglas op het verouderde hout.
* **Seedream 5 Pro Image Prompt:**
  ```text
  Cinematic atmospheric portrait, 9:16 vertical. Jack Howlin sitting at a distressed dark wooden table in a dimly lit rustic tavern corner, resting his weathered hands on the table, intense contemplative gaze directly into the camera lens, mouth closed. Wearing a tan camel-brown canvas work jacket over charcoal henley shirt, full brown beard, wavy hair. Warm flickering kerosine lantern light, deep chiaroscuro shadows, curling cigarette smoke in background, photorealistic 50mm film still.
  ```
* **Seedance 2.5 Video Prompt (Non-Singing Mood):**
  ```text
  Cinematic mood video in 9:16 vertical. Jack Howlin sits in the dark rustic saloon corner, stoic and unmoving, intense piercing eye contact with the camera, subtle breathing, flickering warm lantern light casting moving shadows on his rugged face and canvas jacket, curling smoke slowly rising past the lens, slow dolly push-in.
  ```

---

## 🎬 2. Vocal & Performance Directives

| Modus | Prompt Toevoeging | Gedrag in AI Modellen |
|---|---|---|
| **Non-Singing / Silent Outlaw Mood** | `CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, no tongue movement, and no exaggerated jaw motion. The music is soundtrack only and is not performed by Jack.` | Creëert een 100% rustige, authentieke filmische blik zonder mondvervorming. |
| **Vocal Lip-Sync (InfiniTalk/Kling)** | `Jack sings passionately into the microphone with natural mouth, jaw and neck muscle lip sync matching the vocal lyrics, expressive facial emotion.` | Synchroniseert spraak en zang op de beat en lyrics via dedicated lip-sync engines. |

---

## 🏆 3. De Gouden Prompt Blueprints (Bewezen Succes-Formules)

### Blueprint A: 30-Seconden Silent Outlaw Master (Seedance 2.5 / Wan 2.7 / Wan 3.0)
```json
{
  "duration": 30,
  "aspect_ratio": "9:16",
  "resolution": "480p",
  "generate_audio": false,
  "prompt": "One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin at the roadside of the Midnight Mirage Motel. Jack gives a silent, intense outlaw performance through his eyes, posture, and restrained body language only.\n\nCRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, no tongue movement, and no exaggerated jaw motion. The music is soundtrack only and is not performed by Jack.\n\n• [00:00–00:07] [Roadside Noir Atmosphere]\nAtmospheric medium shot. Jack Howlin stands beside his vintage black pickup truck on a misty midnight desert highway. The weathered turquoise-and-red neon sign of the Midnight Mirage Motel buzzes softly in the foggy distance. Jack wears his signature tan camel-brown heavy canvas work jacket with chest flap pockets over an unbuttoned charcoal-grey henley shirt. Full rugged brown beard and moustache, dark wavy hair moving slightly in the cold desert breeze. He leans against the truck hood and silently scans the dark horizon with stoic intensity. His mouth remains fully closed and motionless.\n\n• [00:07–00:15] [Slow Cinematic Push-In]\nThe camera performs a slow, continuous dolly push toward Jack. He gradually turns his head toward the lens and fixes the camera with a piercing, defiant stare. His expression is conveyed entirely through his eyes and brow. His lips remain sealed, relaxed, and still. Deep shadows and warm amber rim lighting emphasize his rugged facial structure. Distant truck headlights cut through the cold blue midnight mist and reflect across the truck’s wet hood.\n\n• [00:15–00:23] [Instrumental Climax]\nAs the distorted guitars and heavy drums intensify, the camera settles into a dramatic close-up. Jack responds only with a slight narrowing of the eyes, a controlled change in posture, and one subtle head movement timed to the rhythm. He remains completely silent. No singing, talking, lip-syncing, humming, mouth opening, or facial movements resembling speech. Wind carries mist and fine dust particles through the anamorphic frame while red and amber neon reflections pulse across his jacket and rugged features.\n\n• [00:23–00:30] [Stoic Ending]\nThe camera movement smoothly decelerates. Jack holds his intense expression with his mouth still fully closed. A faint, knowing look appears only in his eyes—no smile, smirk, lip movement, or visible exhalation. He slowly turns his gaze away from the camera and looks back down the infinite highway as the distant headlights and glowing motel sign fade into deep cinematic noir shadows.\n\nUnbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight-blue haze, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, zero mouth opening, ultra-consistent Jack Core Set identity."
}
```

### Blueprint B: 15-Seconden Neo-Western Diner Narrative
```json
{
  "duration": 15,
  "aspect_ratio": "9:16",
  "resolution": "480p",
  "prompt": "JACK HOWLIN in 'LAST SONG BEFORE DAWN'. 9:16 vertical TikTok format cinematic outlaw country neo-western film. Late 1970s rural highway at 3:30 AM, glowing faded red neon roadside diner. Jack Howlin, rugged outlaw protagonist with weathered black cowboy hat, boots, brown beard and canvas jacket enters empty diner with red vinyl booths and turning ceiling fan. He puts a coin in vintage jukebox which mechanically plays dirty electric Americana guitar by itself. Jack looks through window: headlights of black 1968 muscle car click on with identical cowboy hat on driver seat. Deep shadows, warm tungsten and neon glow, 35mm film grain, 24fps motion."
}
```

### Blueprint C: Seedream 5 Lite Merch & Lookbook Photography
* **Oversized Hoodie & Campfire Mug:**
  `Cinematic 9:16 vertical night portrait of a young woman with dark hair sitting by a crackling campfire in the desert under a starry night sky. She is wearing the authentic oversized black pullover hoodie from reference image 1, showing the kangaroo pocket and the exact tan Western 'JACK HOWLIN' logo with cowboy hat on the left chest. She is holding the white speckled enamel campfire mug with both hands, warm firelight on her face, deep night shadows.`
* **T-Shirt Tailgate Sunset:**
  `Cinematic 9:16 vertical 35mm film photograph of a cool outlaw country woman (mid 20s, wavy honey-blonde hair, natural freckles) sitting on the tailgate of an old turquoise Ford pickup truck on an empty Mojave desert highway at dusk. She is wearing the exact black short-sleeve t-shirt from reference image 1, featuring the authentic tan vintage Western lettering 'JACK HOWLIN' with the cowboy hat on the left chest. She is bareheaded with wind blowing through her hair, holding the white speckled enamel campfire mug with black rim. Warm sunset sky, moody film grain.`

