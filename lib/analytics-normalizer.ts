import type { IntelligenceReport, ActionablePlaybookItem, Platform } from '@/types'

export function extractSummaryText(summary: unknown): string {
  if (!summary) return ''
  if (typeof summary === 'string') return summary
  if (typeof summary === 'object' && summary !== null) {
    const s = summary as Record<string, unknown>
    if (typeof s.strategicTakeaway === 'string') return s.strategicTakeaway
    if (typeof s.headline === 'string') return s.headline
    if (typeof s.summary === 'string') return s.summary
    if (typeof s.executiveBrief === 'string') return s.executiveBrief
    if (typeof s.keyTakeaway === 'string') return s.keyTakeaway
    if (typeof s.executiveOverview === 'string') return s.executiveOverview
    if (typeof s.description === 'string') return s.description

    // Check nested keyMetricsSummary or string values
    for (const val of Object.values(s)) {
      if (typeof val === 'string' && val.trim().length > 10) return val
    }
  }
  return String(summary)
}

export function extractAlertItem(alert: unknown): { title: string; detail?: string } {
  if (typeof alert === 'string') return { title: alert }
  if (typeof alert === 'object' && alert !== null) {
    const a = alert as Record<string, unknown>
    const titleParts = [a.category, a.issue, a.riskArea, a.title].filter(Boolean)
    let title = titleParts.join(' — ')
    if (!title && typeof a.alert === 'string') title = a.alert
    if (!title && typeof a.observation === 'string') title = a.observation
    if (!title) title = 'Content Signaal'

    if (a.severity && typeof a.severity === 'string') {
      title = `[${a.severity}] ${title}`
    }

    const detailParts = [a.observation, a.mitigationStrategy, a.dataPoint, a.risk, a.remedy].filter(
      (v) => Boolean(v) && v !== title
    )
    const detail = detailParts.join(' • ')
    return { title, detail: detail || undefined }
  }
  return { title: String(alert) }
}

export function extractWinningHooks(rawHooks: unknown): Array<{
  hookTitle: string
  description: string
  effectivenessMultiplier: string
  exampleScene: string
}> {
  if (!rawHooks) return []
  if (Array.isArray(rawHooks)) {
    return rawHooks.map((h, i) => {
      if (typeof h === 'string') {
        return {
          hookTitle: h,
          description: '',
          effectivenessMultiplier: 'Top Score',
          exampleScene: '',
        }
      }
      if (typeof h === 'object' && h !== null) {
        const item = h as Record<string, unknown>
        const hookTitle =
          (typeof item.hookTitle === 'string' && item.hookTitle) ||
          (typeof item.trackTitle === 'string' && typeof item.hookType === 'string'
            ? `${item.trackTitle} — ${item.hookType}`
            : '') ||
          (typeof item.trackTitle === 'string' && item.trackTitle) ||
          (typeof item.hookType === 'string' && item.hookType) ||
          (typeof item.visualConcept === 'string' && item.visualConcept) ||
          `Winning Hook #${i + 1}`

        const effectivenessMultiplier =
          (typeof item.effectivenessMultiplier === 'string' && item.effectivenessMultiplier) ||
          (typeof item.performanceImpact === 'string' && item.performanceImpact) ||
          (typeof item.performanceMetric === 'string' && item.performanceMetric) ||
          'Top Score'

        const description =
          (typeof item.description === 'string' && item.description) ||
          (typeof item.strategicValue === 'string' && item.strategicValue) ||
          (typeof item.whyItWorks === 'string' && item.whyItWorks) ||
          ''

        const exampleScene =
          (typeof item.exampleScene === 'string' && item.exampleScene) ||
          (typeof item.visualConcept === 'string' && item.visualConcept) ||
          (typeof item.strategicValue === 'string' && item.strategicValue !== description ? item.strategicValue : '') ||
          ''

        return {
          hookTitle,
          description,
          effectivenessMultiplier,
          exampleScene,
        }
      }
      return {
        hookTitle: `Hook #${i + 1}`,
        description: '',
        effectivenessMultiplier: 'Top Score',
        exampleScene: '',
      }
    })
  }

  if (typeof rawHooks === 'object' && rawHooks !== null) {
    return Object.entries(rawHooks as Record<string, unknown>).map(([key, val], idx) => {
      if (typeof val === 'object' && val !== null) {
        const v = val as Record<string, unknown>
        return {
          hookTitle:
            (typeof v.hookTitle === 'string' && v.hookTitle) ||
            (typeof v.trackTitle === 'string' ? `${v.trackTitle} (${key})` : key),
          description:
            (typeof v.description === 'string' && v.description) ||
            (typeof v.strategicValue === 'string' && v.strategicValue) ||
            '',
          effectivenessMultiplier:
            (typeof v.effectivenessMultiplier === 'string' && v.effectivenessMultiplier) ||
            (typeof v.performanceImpact === 'string' && v.performanceImpact) ||
            'Top Score',
          exampleScene: (typeof v.exampleScene === 'string' && v.exampleScene) || '',
        }
      }
      return {
        hookTitle: key,
        description: String(val),
        effectivenessMultiplier: 'Top Score',
        exampleScene: '',
      }
    })
  }

  return []
}

export function extractPostingWindows(rawWindows: unknown): Array<{
  platform: Platform
  bestDay: string
  bestTime: string
  reason: string
}> {
  if (!rawWindows) return []
  let list: unknown[] = []
  if (Array.isArray(rawWindows)) {
    list = rawWindows
  } else if (typeof rawWindows === 'object' && rawWindows !== null) {
    list = Object.entries(rawWindows as Record<string, unknown>).map(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        return { platform: key, ...(val as Record<string, unknown>) }
      }
      return { platform: key, bestTime: String(val) }
    })
  }

  return list.map((w) => {
    if (typeof w === 'object' && w !== null) {
      const item = w as Record<string, unknown>
      const rawPlatform = typeof item.platform === 'string' ? item.platform.toLowerCase() : 'youtube'
      const platform: Platform =
        rawPlatform.includes('tiktok')
          ? 'tiktok'
          : rawPlatform.includes('insta')
          ? 'instagram'
          : rawPlatform.includes('face')
          ? 'facebook'
          : 'youtube'

      let bestDay = 'Dagelijks'
      if (typeof item.bestDay === 'string' && item.bestDay.trim()) {
        bestDay = item.bestDay
      } else if (Array.isArray(item.optimalDays) && item.optimalDays.length > 0) {
        bestDay = item.optimalDays.map(String).join(' & ')
      } else if (typeof item.optimalDays === 'string' && item.optimalDays.trim()) {
        bestDay = item.optimalDays
      }

      let bestTime = '19:00 - 21:00 CET'
      if (typeof item.bestTime === 'string' && item.bestTime.trim()) {
        bestTime = item.bestTime
      } else if (Array.isArray(item.peakHoursCST) && item.peakHoursCST.length > 0) {
        bestTime = item.peakHoursCST.map(String).join(' / ')
      } else if (typeof item.peakHoursCST === 'string' && item.peakHoursCST.trim()) {
        bestTime = item.peakHoursCST
      } else if (Array.isArray(item.recommendedTimes) && item.recommendedTimes.length > 0) {
        bestTime = item.recommendedTimes.map(String).join(' / ')
      } else if (typeof item.recommendedTimes === 'string' && item.recommendedTimes.trim()) {
        bestTime = item.recommendedTimes
      }

      const reason =
        (typeof item.reason === 'string' && item.reason) ||
        (typeof item.rationale === 'string' && item.rationale) ||
        (typeof item.audienceContext === 'string' && item.audienceContext) ||
        ''

      return { platform, bestDay, bestTime, reason }
    }
    return {
      platform: 'youtube' as Platform,
      bestDay: 'Dagelijks',
      bestTime: '19:00 - 21:00 CET',
      reason: String(w),
    }
  })
}

export function extractPlaybooks(rawPlaybooks: unknown): ActionablePlaybookItem[] {
  if (!rawPlaybooks) return []
  if (Array.isArray(rawPlaybooks)) {
    return rawPlaybooks.map((p, idx) => {
      if (typeof p === 'object' && p !== null) {
        const item = p as Record<string, unknown>
        const title =
          (typeof item.title === 'string' && item.title) ||
          (typeof item.playbookName === 'string' && item.playbookName) ||
          `Aanbevolen Actie #${idx + 1}`

        const reason =
          (typeof item.reason === 'string' && item.reason) ||
          (typeof item.objective === 'string' && item.objective) ||
          (Array.isArray(item.steps) ? item.steps.map(String).join(' ') : '') ||
          (Array.isArray(item.tactics) ? item.tactics.map(String).join(' ') : '') ||
          ''

        let caption = ''
        if (item.actionPayload && typeof item.actionPayload === 'object') {
          const ap = item.actionPayload as Record<string, unknown>
          if (typeof ap.caption === 'string') caption = ap.caption
        }
        if (!caption && Array.isArray(item.tactics) && item.tactics.length > 0) {
          caption = String(item.tactics[0])
        }
        if (!caption && Array.isArray(item.steps) && item.steps.length > 0) {
          caption = String(item.steps[0])
        }

        const rawType = typeof item.type === 'string' ? item.type : ''
        const type: ActionablePlaybookItem['type'] =
          rawType === 'song_release' || rawType === 'merch_push' || rawType === 'fan_reengage'
            ? rawType
            : 'lyric_short'

        const suggestedPlatforms = Array.isArray(item.suggestedPlatforms)
          ? (item.suggestedPlatforms as Platform[])
          : (['instagram', 'youtube'] as Platform[])

        const priority =
          item.priority === 'high' || item.priority === 'medium' || item.priority === 'low'
            ? item.priority
            : 'high'

        return {
          id: typeof item.id === 'string' ? item.id : `playbook-${idx + 1}`,
          type,
          title,
          targetTrack: typeof item.targetTrack === 'string' ? item.targetTrack : undefined,
          reason,
          recommendedHook: typeof item.recommendedHook === 'string' ? item.recommendedHook : '',
          suggestedPlatforms,
          priority,
          actionPayload: {
            caption,
            suggestedFormat:
              item.actionPayload && typeof (item.actionPayload as Record<string, unknown>).suggestedFormat === 'string'
                ? ((item.actionPayload as Record<string, unknown>).suggestedFormat as string)
                : '9:16 Video',
          },
        }
      }
      return {
        id: `playbook-${idx + 1}`,
        type: 'lyric_short',
        title: String(p),
        reason: '',
        recommendedHook: '',
        suggestedPlatforms: ['youtube', 'instagram'],
        priority: 'high',
      }
    })
  }

  if (typeof rawPlaybooks === 'object' && rawPlaybooks !== null) {
    const obj = rawPlaybooks as Record<string, unknown>
    return Object.entries(obj).map(([key, val], idx) => {
      const keyFormatted = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim()

      if (typeof val === 'object' && val !== null) {
        const item = val as Record<string, unknown>
        const title =
          (typeof item.title === 'string' && item.title) ||
          (typeof item.playbookName === 'string' && item.playbookName) ||
          `${keyFormatted} Strategie`

        const reason =
          (typeof item.reason === 'string' && item.reason) ||
          (typeof item.objective === 'string' && item.objective) ||
          (Array.isArray(item.tactics) ? item.tactics.map(String).join(' ') : '') ||
          (Array.isArray(item.steps) ? item.steps.map(String).join(' ') : '') ||
          ''

        let caption = ''
        if (item.actionPayload && typeof item.actionPayload === 'object') {
          const ap = item.actionPayload as Record<string, unknown>
          if (typeof ap.caption === 'string') caption = ap.caption
        }
        if (!caption && Array.isArray(item.tactics) && item.tactics.length > 0) {
          caption = String(item.tactics[0])
        }
        if (!caption && Array.isArray(item.steps) && item.steps.length > 0) {
          caption = String(item.steps[0])
        }

        const lowerKey = key.toLowerCase()
        const type: ActionablePlaybookItem['type'] =
          typeof item.type === 'string' &&
          (item.type === 'song_release' || item.type === 'merch_push' || item.type === 'fan_reengage')
            ? item.type
            : lowerKey.includes('merch')
            ? 'merch_push'
            : lowerKey.includes('spotify') || lowerKey.includes('release')
            ? 'song_release'
            : 'lyric_short'

        return {
          id: typeof item.id === 'string' ? item.id : `playbook-${key}`,
          type,
          title,
          targetTrack: typeof item.targetTrack === 'string' ? item.targetTrack : undefined,
          reason,
          recommendedHook: typeof item.recommendedHook === 'string' ? item.recommendedHook : '',
          suggestedPlatforms: ['youtube', 'instagram', 'tiktok'],
          priority: 'high',
          actionPayload: {
            caption,
            suggestedFormat: '9:16 Video',
          },
        }
      }

      return {
        id: `playbook-${idx + 1}`,
        type: 'lyric_short',
        title: keyFormatted,
        reason: String(val),
        recommendedHook: '',
        suggestedPlatforms: ['youtube', 'instagram'],
        priority: 'high',
      }
    })
  }

  return []
}

export function extractTrackRadar(rawRadar: unknown): Array<{
  trackTitle: string
  momentumStatus: 'surging' | 'steady' | 'needs_boost'
  growthNote: string
  actionRecommendation: string
}> {
  if (!rawRadar) return []
  let list: unknown[] = []
  if (Array.isArray(rawRadar)) {
    list = rawRadar
  } else if (typeof rawRadar === 'object' && rawRadar !== null) {
    list = Object.values(rawRadar as Record<string, unknown>)
  }

  return list.map((t, idx) => {
    if (typeof t === 'object' && t !== null) {
      const item = t as Record<string, unknown>
      const trackTitle =
        (typeof item.trackTitle === 'string' && item.trackTitle) ||
        (typeof item.title === 'string' && item.title) ||
        (typeof item.trackId === 'string' && item.trackId) ||
        `Track #${idx + 1}`

      const rawStatus = typeof item.momentumStatus === 'string' ? item.momentumStatus : typeof item.status === 'string' ? item.status : ''
      const momentumStatus: 'surging' | 'steady' | 'needs_boost' =
        rawStatus.toLowerCase().includes('boost') || rawStatus.toLowerCase().includes('need')
          ? 'needs_boost'
          : rawStatus.toLowerCase().includes('steady')
          ? 'steady'
          : 'surging'

      const growthNote =
        (typeof item.growthNote === 'string' && item.growthNote) ||
        (typeof item.weeklyGrowthPercent === 'number' ? `+${item.weeklyGrowthPercent}% groei` : '') ||
        (typeof item.primaryDriver === 'string' && item.primaryDriver) ||
        ''

      const actionRecommendation =
        (typeof item.actionRecommendation === 'string' && item.actionRecommendation) ||
        (typeof item.strategicRecommendation === 'string' && item.strategicRecommendation) ||
        ''

      return {
        trackTitle,
        momentumStatus,
        growthNote,
        actionRecommendation,
      }
    }
    return {
      trackTitle: String(t),
      momentumStatus: 'surging',
      growthNote: '',
      actionRecommendation: '',
    }
  })
}

export function normalizeIntelligenceReport(raw: unknown): IntelligenceReport {
  if (!raw || typeof raw !== 'object') {
    return {
      generatedAt: new Date(),
      summary: '',
      winningHooks: [],
      contentFatigueAlerts: [],
      bestPostingWindows: [],
      trackMomentumRadar: [],
      actionablePlaybooks: [],
    }
  }

  const obj = raw as Record<string, unknown>

  const summary = extractSummaryText(obj.summary)
  const winningHooks = extractWinningHooks(obj.winningHooks)
  const contentFatigueAlerts = Array.isArray(obj.contentFatigueAlerts)
    ? obj.contentFatigueAlerts.map((a) => {
        const parsed = extractAlertItem(a)
        return parsed.detail ? `${parsed.title}: ${parsed.detail}` : parsed.title
      })
    : []
  const bestPostingWindows = extractPostingWindows(obj.bestPostingWindows)
  const trackMomentumRadar = extractTrackRadar(obj.trackMomentumRadar)
  const actionablePlaybooks = extractPlaybooks(obj.actionablePlaybooks)

  return {
    id: typeof obj.id === 'string' ? obj.id : 'intelligence_report',
    generatedAt: obj.generatedAt || new Date(),
    summary,
    winningHooks,
    contentFatigueAlerts,
    bestPostingWindows,
    trackMomentumRadar,
    actionablePlaybooks,
  }
}
