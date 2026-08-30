import { NextResponse } from 'next/server'

export interface FourthWallProduct {
  id: string
  name: string
  slug: string
  description: string
  productType: string
  imageUrl: string
  price: number
  currency: string
  url: string
  // Dashboard-enriched fields
  associatedSong: string
  keyHook: string
}

const FW_STOREFRONT_BASE = 'https://storefront-api.fourthwall.com/v1'
const FW_SHOP_DOMAIN = 'jackhowlin.fourthwall.com'

// Song/hook mapping based on product name keywords
function inferSong(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('hate me')) return 'Hate Me All You Want'
  if (n.includes('crown')) return 'I Still Wear This Crown'
  if (n.includes('gravel') || n.includes('outlaw americana')) return 'Gravel Road Confessions'
  if (n.includes('mirage') || n.includes('motel')) return 'Midnight Mirage Motel'
  if (n.includes('amarillo') || n.includes('nashville')) return 'Leaving Amarillo'
  if (n.includes('rain') || n.includes('brother')) return 'Let It Rain, Brother'
  return "Jack Howlin' Original"
}

function inferHook(name: string, productType: string): string {
  const n = name.toLowerCase()
  if (n.includes('hate me')) return 'Talk your talk. The crown stays on.'
  if (n.includes('hoodie')) return 'Wrap yourself in the outlaw spirit. Built for the long road.'
  if (n.includes('tee') || n.includes('t-shirt') || n.includes('crewneck')) return 'Wear the story. Every thread tells it.'
  if (n.includes('cap') || n.includes('hat')) return 'The hat that never bows. Neither do you.'
  if (n.includes('poster')) return 'Frame the outlaw. Own the wall.'
  if (n.includes('mug')) return 'Start the day like an outlaw. No apologies.'
  if (n.includes('tank')) return 'No sleeves. No filter. Pure Jack.'
  return 'Rauw, onverzettelijk, authentiek.'
}

function mapProductType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('hoodie')) return 'Apparel / Hoodie'
  if (n.includes('crewneck')) return 'Apparel / Crewneck'
  if (n.includes('tee') || n.includes('t-shirt')) return 'Apparel / T-Shirt'
  if (n.includes('tank')) return 'Apparel / Tank'
  if (n.includes('trucker') || n.includes('cap') || n.includes('hat')) return 'Headwear'
  if (n.includes('poster') || n.includes('print')) return 'Art / Poster'
  if (n.includes('mug') || n.includes('cup')) return 'Drinkware'
  return 'Merchandise'
}

export async function GET() {
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'FOURTHWALL_STOREFRONT_TOKEN not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${FW_STOREFRONT_BASE}/collections/all/products?storefront_token=${token}&size=50`,
      { next: { revalidate: 300 } } // Cache 5 minutes
    )

    if (!res.ok) {
      throw new Error(`Fourth Wall API returned ${res.status}`)
    }

    const data = await res.json() as { results: Record<string, unknown>[] }

    const products: FourthWallProduct[] = data.results.map((p: Record<string, unknown>) => {
      const variants = (p.variants as Record<string, unknown>[]) || []
      const firstVariant = variants[0] as Record<string, unknown> | undefined
      const unitPrice = firstVariant?.unitPrice as { value: number; currency: string } | undefined
      const images = (p.images as { url: string }[]) || []
      const slug = p.slug as string

      return {
        id: p.id as string,
        name: p.name as string,
        slug,
        description: (p.description as string) || '',
        productType: mapProductType(p.name as string),
        imageUrl: images[0]?.url || '',
        price: unitPrice?.value ?? 0,
        currency: unitPrice?.currency ?? 'USD',
        url: `https://${FW_SHOP_DOMAIN}/products/${slug}`,
        associatedSong: inferSong(p.name as string),
        keyHook: inferHook(p.name as string, mapProductType(p.name as string)),
      }
    })

    return NextResponse.json({ products })
  } catch (err) {
    console.error('Fourth Wall API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Kon producten niet ophalen' },
      { status: 500 }
    )
  }
}
