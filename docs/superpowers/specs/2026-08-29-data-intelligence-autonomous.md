# Jack Howlin' — Data Intelligence & Autonomous Architecture Spec

**Datum:** 2026-08-29  
**Status:** Approved Concept & Architectuurspecificatie

---

## 1. Doel & Visie

Het Jack Howlin' Command Center transformeert van een operationele tool naar een **zelflerend, autonoom groei-ecosysteem**. In plaats van losse functionaliteiten worden alle onderdelen aangedreven door **realtime platformdata** (YouTube, Spotify, Instagram, TikTok) gecombineerd met **Gemini AI Intelligence**.

---

## 2. Architectuur: De Gesloten Feedbackloop

```
+-------------------------------------------------------------------------------+
|                         JACK HOWLIN' DATA INTELLIGENCE                        |
+-------------------------------------------------------------------------------+
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           ▼                                                     ▼
+───────────────────────────+                         +─────────────────────────+
|   PLATFORM DATA SNAPSHOTS |                         |   GEMINI INTELLIGENCE   |
|   - YouTube Video/Shorts  |                         |   - Hook Pattern Recog. |
|   - Spotify Popularity    | ──────────────────────► |   - Track Momentum Score|
|   - Instagram Insights    |                         |   - Actionable Playbooks|
|   - TikTok Video Metrics  |                         +────────────┬────────────+
+───────────────────────────+                                      │
                                                                   ▼
+───────────────────────────────────────────────────────────────────────────────+
|                           COMMAND CENTER ACTIE-MODULES                        |
|                                                                               |
|  [ 1. NEW SONG LAUNCHPAD ]     [ 2. MERCH BATCH MACHINE ]    [ 3. FAN CRM ]   |
|  14-daagse release funnel      Multi-angle post generator    Superfan VIP     |
|  gebaseerd op top audios       gekoppeld aan trending track  community loop   |
+-------------------------------------------------------------------------------+
```

---

## 3. Firestore Datamodellen

### `/analytics_snapshots/{snapshotId}`
```json
{
  "timestamp": "timestamp",
  "period": "daily | weekly",
  "youtube": {
    "totalViews": 125000,
    "shortsViews": 85000,
    "longformViews": 40000,
    "totalComments": 412,
    "avgWatchPercentage": 68.5,
    "topVideos": [
      { "videoId": "abc", "title": "Hate Me All You Want (Short)", "views": 35000, "retention": 82.0 }
    ]
  },
  "spotify": {
    "monthlyListeners": 14200,
    "topTracks": [
      { "trackId": "xyz", "title": "Hate Me All You Want", "popularity": 58, "growthPercent": 14.2 }
    ]
  },
  "instagram": {
    "followers": 8900,
    "reelsReach": 45000,
    "savesCount": 820
  },
  "tiktok": {
    "followers": 12400,
    "videoViews": 92000,
    "sharesCount": 1150
  }
}
```

### `/intelligence_insights/{insightId}`
```json
{
  "generatedAt": "timestamp",
  "topWinningHooks": [
    "Desert/highway visual met tekstflits in eerste 2 seconden levert 45% hogere retentie op.",
    "Quote 'Hate Me All You Want' resoneert het sterkst in comments."
  ],
  "recommendedActions": [
    {
      "type": "merch_push",
      "targetTrack": "Hate Me All You Want",
      "reason": "Spotify stream stijging van +14% deze week.",
      "suggestedAngle": "Statement T-Shirt & Hoodie drop"
    }
  ]
}
```

---

## 4. Rollout Strategie: Naar Volledige Autonomie

1. **Fase 1 (Nu): Copilot Dashboard** — Data inzichtelijk in duidelijke grafieken, handmatige goedkeuring van alle AI-gegenereerde acties.
2. **Fase 2: Semi-Autonoom** — 1-Click bulk inplannen van releasecampagnes en merch drops.
3. **Fase 3: Autopilot Engine** — Volledig autonoom publiceren en interactie beheren op basis van data thresholds en merkveiligheidsregels.
