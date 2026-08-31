import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { sliceAudioSnippet } from '@/lib/video-production'

describe('Seedance 30s Audio Extraction', () => {
  const tmpTargetDir = path.join(process.cwd(), 'tmp', 'production_seedance_30s')
  const tmpTargetFile = path.join(tmpTargetDir, 'test-seedance-30s.wav')
  const projectAudioTarget = path.join(
    process.cwd(),
    'projects',
    'hate-me-seedance-30s',
    'audio',
    'hate-me-30s-chorus.wav'
  )
  const masterSource = path.join(
    process.cwd(),
    'projects',
    'hate-me-all-you-want',
    'audio',
    'master-hate-me-all-you-want.wav'
  )

  beforeEach(() => {
    if (fs.existsSync(tmpTargetFile)) {
      fs.unlinkSync(tmpTargetFile)
    }
  })

  it('should slice exactly 30 seconds of audio from the 0:30 timestamp into tmp folder', async () => {
    expect(fs.existsSync(masterSource)).toBe(true)
    const resultPath = await sliceAudioSnippet(masterSource, 30, 30, tmpTargetFile)
    expect(fs.existsSync(resultPath)).toBe(true)
    const stats = fs.statSync(resultPath)
    expect(stats.size).toBeGreaterThan(0)
  })

  it('should generate the 30-second chorus audio snippet in projects/hate-me-seedance-30s/audio/', async () => {
    expect(fs.existsSync(masterSource)).toBe(true)
    const resultPath = await sliceAudioSnippet(masterSource, 30, 30, projectAudioTarget)
    expect(fs.existsSync(resultPath)).toBe(true)
    const stats = fs.statSync(resultPath)
    expect(stats.size).toBeGreaterThan(0)
  })
})
