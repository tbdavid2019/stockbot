import { NextRequest, NextResponse } from 'next/server'
import { fetchEarningsCalls } from '@/lib/quant/earnings-call'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const symbol = searchParams.get('symbol') || searchParams.get('q') || undefined
    const marketParam = (searchParams.get('market') || 'ALL').toUpperCase()
    const validMarkets = ['TW', 'US', 'JP', 'KR', 'OTHER', 'ALL'] as const
    const market = validMarkets.includes(marketParam as any) ? (marketParam as (typeof validMarkets)[number]) : 'ALL'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 200)

    const data = await fetchEarningsCalls({
      symbol,
      market,
      limit
    })

    return NextResponse.json(
      {
        success: true,
        data
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (err: any) {
    console.error('[API /api/earnings-calls] Error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to fetch earnings calls data'
      },
      { status: 500 }
    )
  }
}
