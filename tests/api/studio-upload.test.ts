import { expect, test, vi } from 'vitest'
import { POST } from '../../app/api/studio/upload/route'
import { NextRequest } from 'next/server'

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: () => ({
      file: () => ({
        save: async () => {},
        makePublic: async () => {},
        publicUrl: () => 'http://mock-url'
      })
    })
  })
}))

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => ({
      add: async () => ({ id: 'mock-file-id' })
    })
  }
}))

test('Upload route without body returns 400 Missing file or type', async () => {
  // Set dev mode to bypass auth
  process.env.NODE_ENV = 'development'
  
  const req = new NextRequest('http://localhost/api/studio/upload', {
    method: 'POST'
  })
  
  const response = await POST(req)
  expect(response.status).toBe(400)
  const json = await response.json()
  expect(json.error).toBe('Missing file or type')
})

test('Upload route in dev mode requires no auth', async () => {
  process.env.NODE_ENV = 'development'
  const formData = new FormData()
  formData.append('file', new Blob(['test'], { type: 'image/png' }), 'test.png')
  formData.append('type', 'image')
  
  const req = new NextRequest('http://localhost/api/studio/upload', {
    method: 'POST',
    body: formData
  })
  
  const response = await POST(req)
  expect(response.status).toBe(200)
})
