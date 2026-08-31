// lib/higgsfield.ts — Server-side only
const BASE_URL = process.env.HIGGSFIELD_API_BASE_URL ?? 'https://api.higgsfield.ai'
const KEY_ID = process.env.HIGGSFIELD_API_KEY_ID ?? ''
const KEY_SECRET = process.env.HIGGSFIELD_API_KEY_SECRET ?? ''

export interface HiggsfieldCreateTaskResponse {
  request_id: string
  status: string
  status_url?: string
  cancel_url?: string
}

export interface HiggsfieldImageTaskParams {
  prompt: string
  aspectRatio?: string
  resolution?: '2K' | '4K' | '720p' | '1080p'
  referenceImageUrl?: string
  enhancePrompt?: boolean
}

export interface HiggsfieldVideoTaskParams {
  prompt: string
  aspectRatio?: string
  resolution?: '480p' | '720p' | '1080p' | '720' | '1080'
  duration?: number | string
  imageUrl?: string
  generateAudio?: boolean
  modelType?: 'veo3.1' | 'dop'
}

export interface HiggsfieldTaskStatus {
  requestId: string
  state: 'waiting' | 'success' | 'fail'
  status: string
  resultUrls: string[]
  failMsg?: string
  raw?: Record<string, unknown>
}

function getAuthHeader(): Record<string, string> {
  const keyId = KEY_ID || process.env.HIGGSFIELD_API_KEY_ID || ''
  const keySecret = KEY_SECRET || process.env.HIGGSFIELD_API_KEY_SECRET || ''

  if (!keyId || !keySecret) {
    throw new Error('Higgsfield API credentials (HIGGSFIELD_API_KEY_ID & HIGGSFIELD_API_KEY_SECRET) are missing')
  }

  return {
    Authorization: `Key ${keyId}:${keySecret}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Normalizes aspect ratios to Higgsfield supported formats.
 */
export function normalizeAspectRatio(ratio: string): string {
  const supported = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9']
  if (supported.includes(ratio)) return ratio
  if (ratio === '4/5' || ratio === '4:5') return '3:4'
  if (ratio === '5/4' || ratio === '5:4') return '4:3'
  return '9:16' // Default social format
}

/**
 * Normalizes video duration to Veo 3.1 supported string enum ('4', '6', '8').
 */
export function normalizeVideoDuration(duration?: number | string): '4' | '6' | '8' {
  const num = typeof duration === 'string' ? parseInt(duration, 10) : duration ?? 6
  if (num <= 4) return '4'
  if (num >= 8) return '8'
  return '6'
}

/**
 * Submit an Image generation task to Higgsfield (Soul Standard or Soul Reference).
 */
export async function createHiggsfieldImageTask(
  params: HiggsfieldImageTaskParams
): Promise<HiggsfieldCreateTaskResponse> {
  const headers = getAuthHeader()
  const aspectRatio = normalizeAspectRatio(params.aspectRatio || '9:16')

  // If a reference image is provided (e.g. Jack Core Set photo), use Soul Reference for character consistency
  if (params.referenceImageUrl) {
    const endpoint = `${BASE_URL}/higgsfield-ai/soul/reference`
    const resolution = params.resolution === '4K' || params.resolution === '1080p' ? '1080p' : '720p'
    const body = {
      prompt: params.prompt,
      image_reference_url: params.referenceImageUrl,
      resolution,
      aspect_ratio: aspectRatio,
      enhance_prompt: params.enhancePrompt ?? true,
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Higgsfield Soul Reference failed [${res.status}]: ${errorText}`)
    }

    const data = (await res.json()) as HiggsfieldCreateTaskResponse
    return data
  }

  // Otherwise standard Soul text-to-image
  const endpoint = `${BASE_URL}/higgsfield-ai/soul/standard`
  const resolution = params.resolution || '1080p'
  const body = {
    prompt: params.prompt,
    num_images: 1,
    resolution,
    aspect_ratio: aspectRatio,
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Higgsfield Soul Standard failed [${res.status}]: ${errorText}`)
  }

  const data = (await res.json()) as HiggsfieldCreateTaskResponse
  return data
}

/**
 * Submit a Video generation task to Higgsfield (Veo 3.1 or Dop).
 */
export async function createHiggsfieldVideoTask(
  params: HiggsfieldVideoTaskParams
): Promise<HiggsfieldCreateTaskResponse> {
  const headers = getAuthHeader()
  const aspectRatio = normalizeAspectRatio(params.aspectRatio || '9:16')
  const duration = normalizeVideoDuration(params.duration)
  const resolution =
    params.resolution === '720p' || params.resolution === '720' || params.resolution === '480p'
      ? '720'
      : '1080'

  if (params.modelType === 'dop' && params.imageUrl) {
    const endpoint = `${BASE_URL}/higgsfield-ai/dop/standard`
    const body = {
      prompt: params.prompt,
      image_url: params.imageUrl,
      enhance_prompt: true,
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Higgsfield Dop failed [${res.status}]: ${errorText}`)
    }

    const data = (await res.json()) as HiggsfieldCreateTaskResponse
    return data
  }

  // Veo 3.1 (Image-to-Video or Text-to-Video)
  const endpoint = params.imageUrl
    ? `${BASE_URL}/veo3.1/image-to-video`
    : `${BASE_URL}/veo3.1`

  const body = params.imageUrl
    ? {
        prompt: params.prompt,
        image_url: params.imageUrl,
        duration,
        resolution,
        aspect_ratio: aspectRatio === '16:9' ? '16:9' : '9:16',
        generate_audio: params.generateAudio ?? false,
      }
    : {
        prompt: params.prompt,
        duration,
        resolution,
        aspect_ratio: aspectRatio === '16:9' ? '16:9' : '9:16',
        generate_audio: params.generateAudio ?? false,
      }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Higgsfield Veo 3.1 failed [${res.status}]: ${errorText}`)
  }

  const data = (await res.json()) as HiggsfieldCreateTaskResponse
  return data
}

/**
 * Query the status of a Higgsfield generation request and format result.
 */
export async function getHiggsfieldTaskStatus(
  requestId: string
): Promise<HiggsfieldTaskStatus> {
  const headers = getAuthHeader()
  const res = await fetch(`${BASE_URL}/requests/${encodeURIComponent(requestId)}/status`, {
    headers,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Higgsfield getStatus failed [${res.status}]: ${text}`)
  }

  const json = (await res.json()) as Record<string, unknown>
  const status = (json.status as string) || 'queued'

  const resultUrls: string[] = []

  // Collect any images or video URLs
  if (Array.isArray(json.images)) {
    for (const img of json.images) {
      if (typeof img === 'string') {
        resultUrls.push(img)
      } else if (img && typeof img === 'object' && 'url' in img) {
        const urlVal = (img as Record<string, unknown>).url
        if (typeof urlVal === 'string') resultUrls.push(urlVal)
      }
    }
  }

  if (Array.isArray(json.videos)) {
    for (const vid of json.videos) {
      if (typeof vid === 'string') {
        resultUrls.push(vid)
      } else if (vid && typeof vid === 'object' && 'url' in vid) {
        const urlVal = (vid as Record<string, unknown>).url
        if (typeof urlVal === 'string') resultUrls.push(urlVal)
      }
    }
  }

  if (json.result && typeof json.result === 'object' && 'url' in json.result) {
    const urlVal = (json.result as Record<string, unknown>).url
    if (typeof urlVal === 'string') resultUrls.push(urlVal)
  }

  if (typeof json.url === 'string') {
    resultUrls.push(json.url)
  }

  let state: 'waiting' | 'success' | 'fail' = 'waiting'
  let failMsg: string | undefined

  if (status === 'completed') {
    state = 'success'
  } else if (['failed', 'error', 'canceled', 'nsfw'].includes(status)) {
    state = 'fail'
    failMsg = (json.error as string) || (json.detail as string) || `Higgsfield status: ${status}`
  }

  return {
    requestId,
    state,
    status,
    resultUrls,
    failMsg,
    raw: json,
  }
}

/**
 * Cancel a queued Higgsfield request.
 */
export async function cancelHiggsfieldTask(requestId: string): Promise<boolean> {
  const headers = getAuthHeader()
  const res = await fetch(`${BASE_URL}/requests/${encodeURIComponent(requestId)}/cancel`, {
    method: 'POST',
    headers,
  })
  return res.ok || res.status === 202
}
