import { expect, test, vi } from 'vitest'
import { POST } from '../../app/api/analytics/insights/route'

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => ({
      orderBy: () => ({
        limit: () => ({
          get: async () => ({ empty: true, docs: [] })
        })
      }),
      doc: () => ({
        set: async () => ({})
      })
    })
  }
}))

test('Insights route returns 200 and report', async () => {
  // We don't have GEMINI_API_KEY so it should hit the fallback report path
  const response = await POST()
  expect(response.status).toBe(200)
  
  const json = await response.json()
  expect(json.report).toBeDefined()
  expect(json.report.summary).toBeDefined()
  expect(json.report.winningHooks).toBeDefined()
  expect(json.report.actionablePlaybooks).toBeDefined()
})
