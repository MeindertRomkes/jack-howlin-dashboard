import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const cloudFunctionUrl = 'https://fetchcommentshttp-7w54ng23wa-ew.a.run.app'

    const res = await fetch(cloudFunctionUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Fetch comments Cloud Function error:', errorText)
      return NextResponse.json(
        { error: 'Comments ophalen via cloud provider mislukt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Comments succesvol gesynchroniseerd' })
  } catch (error) {
    console.error('Sync comments route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Synchronisatiefout' },
      { status: 500 }
    )
  }
}
