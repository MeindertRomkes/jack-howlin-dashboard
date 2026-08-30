import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalyticsPage from '../../app/(dashboard)/analytics/page'

vi.mock('@/lib/firestore', () => ({
  getLatestAnalyticsSnapshot: async () => null,
  getLatestIntelligenceReport: async () => null,
}))

test('renders AnalyticsPage with loading skeleton, then main UI', async () => {
  render(<AnalyticsPage />)
  
  // Toont 'Sync Live Data & AI' knop
  const syncButton = await screen.findByText(/Sync Live Data & AI/i)
  expect(syncButton).toBeInTheDocument()
})
