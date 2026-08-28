# Jack Howlin' — Social Media Dashboard Design

**Date:** 2026-08-28
**Author:** Meindert (with Antigravity)
**Status:** Approved — ready for implementation planning

---

## Overview

Jack Howlin' is a modern Outlaw Americana artist and cinematic storytelling project built around music, character, visual world-building and merchandise. This dashboard is the central tool for managing Jack's social media presence — scheduling content across platforms and managing comment replies with Jack's authentic voice.

This document contains the full design for the MVP and a complete roadmap for future phases, so any future session can pick up exactly where we left off.

---

## Background: The Jack Howlin' Brand

> This section is critical context for all AI-generated content (captions, replies, suggestions). Every Gemini prompt must be grounded in this identity.

### Who is Jack Howlin'?

Jack Howlin' is a modern outlaw wandering through a world caught somewhere between the Old West and present-day America. His songs tell stories of judgment, heartbreak, pride, freedom and coming back when everyone expected him to stay down.

**His cowboy hat is his crown.** It may be dusty. It may be beaten up. People may try to knock it off his head. But Jack keeps wearing it.

**Core attitude:** `The outlaw who refuses to bow.`

He is judged, hunted, rejected — and still standing.

### Brand Pillars

| Pillar | Description | Key Song |
|---|---|---|
| **Defiance** | Jack is not defined by other people's judgment | Hate Me All You Want |
| **Resilience** | He gets knocked down and keeps coming back | I Still Wear This Crown |
| **Freedom** | Highways, open land, nobody owns Jack | — |
| **Story** | Every song is a chapter in a larger world | — |

### Tone of Voice

**Do:**
- Short, confident, never apologetic
- Never tries too hard
- Feels like someone who has been through things but doesn't dwell on it
- Max 2 sentences for replies
- Understated power

**Don't:**
- Exclamation marks (unless ironic)
- "Hey guys!", "Check it out!", emoji overload
- Overly cowboy cosplay ("Howdy partner!")
- Slick Nashville pop-country vibe
- Victim language

**Examples of correct Jack tone:**
```
"Been riding. Never stopped."
"Still here. Always have been."
"They talked. I kept riding."
"Wanted by some. Forgotten by none."
"Hate me all you want."
"Make of it what you will."
```

### Visual Identity Keywords

`Cinematic · Weathered · Dusty · Outlaw · Defiant · Lonely · Rugged · Americana · Western · Southern · Vintage · Dark · Raw · Road-worn · Rebellious`

**Avoid:** clean Nashville pop-country, rodeo costume, cartoon cowboy, bright country festival aesthetic.

### Visual World

Two worlds that blend emotionally (not historically):

**Period Western:** sheriff office, dusty main street, wanted posters, saloon, horse, revolver belt, weathered wood, old paper, prairie, tumbleweed, sunset.

**Modern Americana:** roadside motel, old American pickup, neon, highway, abandoned gas station, diner, whiskey bar, modern leather jacket, roadtrip aesthetic.

### Current Infrastructure

| Asset | Platform/Service |
|---|---|
| Music creation | Suno |
| Music distribution | DistroKid |
| Streaming | Spotify, YouTube (primary), Apple Music |
| Social | YouTube, TikTok, Instagram |
| Website | jackhowlin.com |
| Merch | Fourth Wall |

### Key Songs / Releases

- **Hate Me All You Want** — defiance anthem, first major statement
- **I Still Wear This Crown** — resilience, the hat as crown symbolism

### Merchandise Lines

Three intensity levels:
1. **Minimal** — small Jack Howlin' logo, left chest, highly wearable
2. **Brand** — `JACK HOWLIN' / OUTLAW AMERICANA` emblem
3. **Statement** — lyrics/artwork (e.g., I STILL WEAR THIS CROWN)

---

## Problem Statement

Managing Jack's social presence across YouTube, Instagram and TikTok is increasingly time-consuming. Two specific pain points:

1. **Comment management** — Reading all comments, thinking of on-brand replies, typing and posting them takes significant time. Risk of either ignoring fans or posting replies that feel off-brand.

2. **Content scheduling** — Keeping track of what to post when across three platforms has no central system. Posts get missed or poorly timed.

---

## MVP Scope

**Phase 1 (this implementation):**
- YouTube comment inbox with AI-generated Jack-style replies
- Content calendar with post scheduling via Google Cloud Scheduler
- Jack voice learning system (learns from approved replies)
- Firebase-hosted dashboard (Next.js)
- Google Auth (single user — Meindert only)

**Explicitly out of MVP scope:**
- Instagram and TikTok comment management (Phase 2)
- Analytics (Phase 3)
- Video creation tools (Phase 4)
- Auto-posting comments without approval (Phase 5)
- Suno/DistroKid release integration (Phase 6)

---

## Architecture

### Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js (App Router) | SSR for API calls, industry standard for dashboards |
| Auth | Firebase Auth (Google) | Single user, zero config, free |
| Database | Firestore | Document model fits comments/posts perfectly, free tier sufficient |
| Backend | Firebase Functions | Serverless, co-located with Firebase, free tier sufficient |
| Hosting | Firebase Hosting | One command deploy, free |
| Scheduling | Google Cloud Scheduler | Native Google ecosystem, first 3 jobs free |
| AI | Gemini API | Jack voice generation + learning from approved replies |
| Social APIs | YouTube Data API v3 (MVP), Instagram Graph API (Phase 2), TikTok API (Phase 3) | Direct posting, no third-party dependency |

### System Diagram

```
+-------------------------------------+
|       Jack Howlin' Dashboard        |
|       (Next.js — browser)           |
+------------------+------------------+
                   |
       +-----------v-----------+
       |   Firebase            |
       |   +- Auth (Google)    |
       |   +- Firestore DB     |
       |   +- Hosting          |
       +-----------+-----------+
                   |
       +-----------v------------------------------+
       |   Firebase Functions                     |
       |   +- fetchComments (every 30 min)        |<-- Cloud Scheduler
       |   +- generateReplies (Gemini)            |
       |   +- postScheduled (every 5 min)         |<-- Cloud Scheduler
       +-----------+------------------------------+
                   |
       +-----------v------------------------------+
       |   External APIs                          |
       |   +- YouTube Data API v3                 |
       |   +- Instagram Graph API (Phase 2)       |
       |   +- TikTok API (Phase 3)                |
       |   +- Gemini API                          |
       +------------------------------------------+
```

### Google Cloud Scheduler Jobs

| Job | Schedule | Function | Purpose |
|---|---|---|---|
| `fetch-comments` | every 30 min | `fetchComments` | Pull new comments from YouTube |
| `post-scheduled` | every 5 min | `postScheduled` | Check Firestore for due posts and publish |

### Firebase Plan

**Blaze (pay-as-you-go) required** for outbound API calls from Firebase Functions.
Expected cost: **$0–$2/month**. Set a billing alert at $5 as safety net.

---

## Feature Design

### Feature 1: Comment Dashboard

**Flow:**
1. `fetchComments` Function runs every 30 min, pulls new YouTube comments via YouTube Data API v3
2. Each new comment is stored in Firestore with status `new`
3. `generateReplies` is triggered, calls Gemini API with Jack context + last 20 approved replies
4. User opens dashboard, sees comment inbox sorted by newest/unreplied
5. User selects a reply option (or writes custom), clicks Post
6. Reply posted via YouTube API, comment status updated to `replied`
7. Chosen reply saved to `voice_history` collection for future learning

**UI Layout:**
```
+---------------------------------------------+
|  Comments — YouTube (23 new)                |
|  [YouTube v]              [Oldest | Newest] |
+---------------------------------------------+
|  @dusty_rider_66 · "Hate Me All You Want"   |
|  "This hits different man, where you been?" |
|                                             |
|  O  Been riding. Never stopped.             |
|  O  Still here. Always have been.           |
|  O  [write your own...]                     |
|                                             |
|                         [Post]  [Skip]      |
+---------------------------------------------+
|  @western_soul · "I Still Wear This Crown"  |
|  "played this 10 times today bro"           |
|  ...                                        |
+---------------------------------------------+
```

**Jack Voice Learning — Gemini Prompt Structure:**
```
SYSTEM: You are writing social media replies for Jack Howlin',
a modern Outlaw Americana artist.

Jack's voice:
- Short, confident, never apologetic
- Never tries too hard
- Max 2 sentences
- No exclamation marks unless ironic
- Feels like someone who has been through things but doesn't dwell on it

Here are examples of replies Jack has used before that felt right:
[last 20 approved replies from voice_history]

Generate 3 distinct reply options for this comment.
Keep each reply under 20 words.
Vary the tone slightly between the 3 options.

Comment: "{comment_text}"
```

### Feature 2: Content Calendar

**Flow:**
1. User clicks `+ New Post` in calendar
2. Fills in: platform(s), date/time, caption (Gemini suggestion available), media upload
3. Post saved to Firestore with status `scheduled`
4. Every 5 min: `postScheduled` checks for posts where `scheduled_at <= now` and `status == scheduled`
5. Publishes to platform API, updates status to `posted` (or `failed` with error)

**Platform-specific constraints enforced in UI:**
- Instagram caption: max 2,200 characters
- TikTok description: max 2,200 characters
- YouTube title: max 100 characters, description: max 5,000 characters

**Caption AI Assist — Gemini Prompt:**
```
SYSTEM: Write a social media caption for Jack Howlin',
a modern Outlaw Americana artist.

Jack's tone: short, confident, never apologetic, never tries too hard.
No exclamation marks. Max 3 sentences.
Platform: {platform}
Context: {user_provided_context}

Write 2 caption options.
```

---

## Firestore Data Model

```
/users/{userId}
  +- email: string
  +- jackContext: string          <- Jack brand context (editable)
  +- connectedPlatforms: []       <- ["youtube", "instagram", "tiktok"]

/comments/{commentId}
  +- platform: "youtube" | "instagram" | "tiktok"
  +- platformCommentId: string    <- native platform ID (deduplication)
  +- videoId: string
  +- videoTitle: string
  +- author: string
  +- authorAvatar: string
  +- text: string
  +- publishedAt: timestamp
  +- fetchedAt: timestamp
  +- status: "new" | "replied" | "ignored"
  +- generatedReplies: string[]   <- 3 AI-generated options
  +- chosenReply: string | null

/posts/{postId}
  +- platforms: string[]          <- ["youtube", "instagram"]
  +- caption: string
  +- mediaUrl: string | null
  +- mediaType: "image" | "video" | null
  +- scheduledAt: timestamp
  +- status: "draft" | "scheduled" | "posted" | "failed"
  +- postedAt: timestamp | null
  +- errorMessage: string | null
  +- createdAt: timestamp

/voice_history/{id}
  +- commentText: string          <- the original comment
  +- chosenReply: string          <- what Jack replied
  +- platform: string
  +- videoTitle: string
  +- timestamp: timestamp
```

---

## API Setup Required

### YouTube Data API v3
- Enable in Google Cloud Console
- OAuth 2.0 credentials for posting
- Scopes: `youtube.readonly` (comments), `youtube.force-ssl` (posting replies)
- Store refresh token securely in Firestore `/users/{userId}`

### Instagram Graph API (Phase 2)
- Requires Meta Business account + Facebook Page linked to Instagram
- App Review required for `instagram_manage_comments` permission
- Store long-lived access token in Firestore

### TikTok API (Phase 3)
- TikTok for Developers account required
- App approval process for content posting scope
- Store access token in Firestore

---

## Project Structure

```
valiant-shannon/
+- app/                          <- Next.js App Router
|  +- (auth)/
|  |  +- login/page.tsx
|  +- (dashboard)/
|  |  +- layout.tsx              <- dashboard shell
|  |  +- page.tsx                <- overview/home
|  |  +- comments/page.tsx       <- comment inbox
|  |  +- calendar/page.tsx       <- content calendar
|  +- api/
+- components/
|  +- comments/
|  |  +- CommentCard.tsx
|  |  +- ReplyOptions.tsx
|  +- calendar/
|     +- CalendarGrid.tsx
|     +- PostModal.tsx
+- lib/
|  +- firebase.ts                <- Firebase client config
|  +- firestore.ts               <- Firestore helpers
|  +- gemini.ts                  <- Gemini API helpers
+- functions/                    <- Firebase Functions
|  +- src/
|  |  +- fetchComments.ts
|  |  +- generateReplies.ts
|  |  +- postScheduled.ts
|  +- package.json
+- docs/
|  +- superpowers/
|     +- specs/
|        +- 2026-08-28-jack-howlin-dashboard-design.md
+- firebase.json
+- firestore.rules
+- package.json
```

---

## Roadmap

### Phase 1 — MVP (current)
- [x] Design approved
- [ ] Firebase project setup + Auth
- [ ] Firestore data model
- [ ] Next.js dashboard scaffold
- [ ] YouTube API integration (fetch comments)
- [ ] Gemini reply generation + Jack voice learning
- [ ] Comment inbox UI
- [ ] Content calendar UI
- [ ] Google Cloud Scheduler setup
- [ ] YouTube post scheduling
- [ ] Firebase Hosting deploy

### Phase 2 — Instagram & TikTok
- [ ] Instagram Graph API (comments + scheduling)
- [ ] TikTok API (comments + scheduling)
- [ ] Multi-platform comment inbox (filter by platform)
- [ ] Cross-platform post scheduling

### Phase 3 — Analytics
- [ ] YouTube video performance dashboard
- [ ] Best performing post times per platform
- [ ] Content suggestions based on performance
- [ ] Jack voice learning insights

### Phase 4 — Video Creation Tools
- [ ] Kie API integration for AI video generation
- [ ] Higgsfield integration (future)
- [ ] Video creation workflow inside dashboard
- [ ] Jack character reference images in Firebase Storage

### Phase 5 — Automation
- [ ] Auto-comment mode (confidence threshold)
- [ ] Configurable per platform and video
- [ ] Full audit log of all auto-posted replies

### Phase 6 — Release Integration
- [ ] DistroKid release trigger
- [ ] New release -> auto-generate content campaign (7-day plan)
- [ ] Suno track -> directly into content workflow

---

## Design Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Hosting | Firebase | No server management, free tier, Google ecosystem |
| Frontend | Next.js | SSR for API calls, industry standard |
| Scheduling | Google Cloud Scheduler | Native Google, no external dependency, free |
| Make.com | Not used | Replaced by Cloud Scheduler + direct API calls |
| AI | Gemini API | Best Firebase integration, strong few-shot learning |
| Voice learning | Few-shot prompting | No fine-tuning needed, works immediately |
| Comment polling | Every 30 min | Balance between freshness and API quota |
| Post scheduling | Every 5 min | Max 5 min delay OK for social, cost ~$0-2/month |
| Auth | Google only | Single user (Meindert), zero friction |

---

*Full Jack Howlin' brand context preserved in this document. All future sessions should reference this file for brand voice, visual identity, and technical decisions.*
