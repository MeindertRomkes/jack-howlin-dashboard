// lib/kie.ts — Server-side only
const BASE_URL = process.env.KIE_API_BASE_URL ?? 'https://api.kie.ai/api/v1'
const API_KEY = process.env.KIE_API_KEY ?? ''

export interface CreateKieTaskParams {
  model: string
  input: Record<string, unknown>
  callBackUrl?: string
}

export interface KieTaskStatusResponse {
  taskId: string
  model: string
  state: 'waiting' | 'success' | 'fail'
  resultJson: string | null
  failCode: string | null
  failMsg: string | null
  costTime: number | null
  completeTime: number | null
  createTime: number
}

function authHeader() {
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
}

export async function createKieTask(params: CreateKieTaskParams): Promise<{ taskId: string }> {
  const res = await fetch(`${BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kie createTask failed [${res.status}]: ${text}`)
  }
  const json = await res.json() as { code: number; msg: string; data: { taskId: string } }
  if (json.code !== 200) throw new Error(`Kie error: ${json.msg}`)
  return { taskId: json.data.taskId }
}

export async function getKieTaskStatus(taskId: string): Promise<KieTaskStatusResponse> {
  const res = await fetch(`${BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: authHeader(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kie getStatus failed [${res.status}]: ${text}`)
  }
  const json = await res.json() as { code: number; msg: string; data: KieTaskStatusResponse }
  if (json.code !== 200) throw new Error(`Kie error: ${json.msg}`)
  return json.data
}
