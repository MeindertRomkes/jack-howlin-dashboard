import { NextResponse } from 'next/server'

export async function GET() {
  return new NextResponse('tiktok-developers-site-verification=A5qY7HOIOrA0WxAuKei86m07HnHkZDVL', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
