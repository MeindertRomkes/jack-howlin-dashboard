---
name: kie-media
description: |
  Plan, generate, edit, animate, upscale, and produce media via Kie.ai CLI and MCP tools.
  Models available: Nano Banana Pro/2/Lite, Veo 3, Wan 3.0/2.7, Kling 3.0/Avatar, Suno V5.5,
  ElevenLabs, Grok Imagine, GPT Image 2, Midjourney, Qwen, Topaz Upscale, InfiniTalk Lip-Sync,
  OmniHuman, Runway Aleph, Hailuo, and HappyHorse.
  Use when: "generate an image with kie", "make a video with veo3 / wan / kling", "create music with suno",
  "upscale with topaz", "lip sync with infinitalk / kling avatar", "run kie-cli", or "use kie mcp".
argument-hint: "[tool-or-command] [--prompt <prompt>] [--image <path>] [--wait]"
---

# Kie.ai Media Generation & CLI/MCP Guide

Generate images, videos, audio, lip-sync, talking avatars, upscaled media, and music using the unified Kie.ai tool suite via CLI (`npx kie-cli` or `npm run kie --`) and MCP server (`@felores/kie-ai-mcp-server`).

---

## 1. Setup & Authentication

1. **API Key**:
   Set `KIE_AI_API_KEY` in `.env.local` or environment variables:
   ```bash
   export KIE_AI_API_KEY="your-kie-ai-api-key"
   ```
   Get an API key at: [kie.ai/api-key](https://kie.ai/api-key).

2. **Run with NPM or NPX**:
   - In this project: `npm run kie -- <command> [args]`
   - Or via npx: `npx kie-cli <command> [args]`

---

## 2. Available Models & Tools

### Image Generation & Editing
| Tool | Model & Capabilities | Common Flags |
|---|---|---|
| `nano_banana_image` | Nano Banana 2 & 2 Lite (4K, up to 14 image references, search grounding) | `--prompt`, `--image`, `--model nano_banana_2\|nano_banana_2_lite`, `--aspect_ratio` |
| `gpt_image_2` | GPT Image 2 (high fidelity text-to-image and image-to-image with up to 16 references) | `--prompt`, `--image`, `--aspect_ratio`, `--resolution` |
| `midjourney_generate` | Midjourney AI (text-to-image, style reference, omni reference) | `--prompt`, `--aspect_ratio`, `--mode` |
| `qwen_image` | Qwen Image (text-to-image and image editing) | `--prompt`, `--image` |
| `z_image` | Tongyi-MAI Z-Image (Ultra-fast Turbo, bilingual Chinese/English typography) | `--prompt`, `--aspect_ratio` |
| `topaz_upscale_image` | Topaz Labs AI Upscaler (1x–8x upscale, texture restoration) | `--image`, `--scale 2\|4\|8` |
| `recraft_remove_background` | Recraft AI background remover | `--image` |
| `ideogram_reframe` | Ideogram V3 Reframe to new aspect ratios | `--image`, `--aspect_ratio` |

### Video Generation & Animation
| Tool | Model & Capabilities | Common Flags |
|---|---|---|
| `veo3_generate_video` | Google Veo 3 (cinematic text-to-video / image-to-video) | `--prompt`, `--image`, `--duration`, `--aspect_ratio` |
| `veo3_get_1080p_video` | Get 1080P HD version of Veo 3 output | `--task_id` |
| `wan_video` | Alibaba Wan 2.7 / 3.0 (T2V, I2V, multi-reference, native audio) | `--prompt`, `--first_frame`, `--last_frame`, `--references` |
| `wan_animate` | Alibaba Wan 2.2 Animate (motion transfer & static image animation) | `--image`, `--motion_video` |
| `kling_video` | Kling 3.0 AI (3-15s duration, multilingual audio, std/pro modes) | `--prompt`, `--image`, `--duration`, `--mode std\|pro` |
| `kling_avatar` | Kling AI Talking Avatar (portrait photo + audio track) | `--image`, `--audio` |
| `infinitalk_lip_sync` | MeiGen-AI InfiniTalk Lip-Sync Talking Avatar | `--image`, `--audio` |
| `omnihuman_video` | ByteDance OmniHuman 1.5 (portrait / pet animation with audio) | `--image`, `--audio` |
| `runway_aleph_video` | Runway Aleph Video-to-Video AI editing | `--video`, `--prompt` |
| `hailuo_video` | MiniMax H3 (Hailuo 03) video generation | `--prompt`, `--image` |
| `happyhorse_video` | Alibaba HappyHorse 1.0 video generation | `--prompt`, `--image` |
| `grok_imagine` | xAI Grok Imagine (image / video with synced audio) | `--prompt`, `--image`, `--mode` |
| `gemini_omni` | Gemini Omni video and reusable characters/voices | `--prompt`, `--references` |

### Audio & Music
| Tool | Model & Capabilities | Common Flags |
|---|---|---|
| `suno_generate_music` | Suno (V3.5, V4, V4.5, V5, V5.5) music generator | `--prompt`, `--model V5_5`, `--duration`, `--tags` |

### Utilities & Task Management
- `list_models`: Browse all source-backed models and filter by keyword.
- `list_tasks`: View recent tasks and their progress.
- `get_task_status --task_id <id>`: Check state (`PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`).
- `wait_for_task --task_id <id>`: Block until generation completes and output the media URLs.
- `upload_file --file <path>`: Upload a local image/video/audio file directly to Kie.ai.
- `prepare_media_generation`: Create a validated plan with pricing before running generation tasks.
- `submit_media_generation`: Submit an approved generation plan.

---

## 3. CLI Usage Examples

```bash
# 1. Generate an image with Nano Banana 2
npm run kie -- nano_banana_image --prompt "Cyberpunk street market at midnight, neon lighting, highly detailed 4k"

# 2. Generate a video with Google Veo 3
npm run kie -- veo3_generate_video --prompt "A sleek red sports car cruising through a coastal highway at sunset, drone camera shot"

# 3. Generate music with Suno V5.5
npm run kie -- suno_generate_music --prompt "Upbeat tropical house track with airy synths and summer vibes" --model V5_5

# 4. Check task status or wait for task
npm run kie -- get_task_status --task_id <task_id>
npm run kie -- wait_for_task --task_id <task_id>

# 5. List available models
npm run kie -- list_models --filter "video"
```

---

## 4. MCP Server Integration

The MCP server is registered in `~/.gemini/config/mcp_config.json` under `"kie-ai"`:
```json
{
  "mcpServers": {
    "kie-ai": {
      "command": "npx",
      "args": ["-y", "@felores/kie-ai-mcp-server"],
      "env": {
        "KIE_AI_API_KEY": "${KIE_AI_API_KEY}"
      }
    }
  }
}
```

When interacting through MCP tools:
1. `prepare_media_generation` validates options, calculates credit pricing, and creates a plan.
2. After user confirmation, `submit_media_generation` submits the plan and begins generation.
3. `wait_for_task` or `get_task_status` tracks progress until the final asset URLs are ready.
