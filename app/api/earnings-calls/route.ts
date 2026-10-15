import { NextRequest, NextResponse } from 'next/server'
import { fetchEarningsCalls } from '@/lib/quant/earnings-call'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Optional debug probe to verify BigGo API connectivity directly
    if (searchParams.get('debug') === '1') {
      try {
        const testRes = await fetch(
          'https://api.biggo.com/api/v1/finance/stock/earnings-calls/list?start_date=2026-10-09&end_date=2026-10-15&stock_filter=all',
          {
            headers: {
              Accept: 'application/json',
              Site: 'finance.biggo.com.tw',
              Referer: 'https://finance.biggo.com.tw/earnings-call?t=all',
              Origin: 'https://finance.biggo.com.tw',
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(6000)
          }
        )
        const text = await testRes.text()
        return NextResponse.json({
          debug: true,
          status: testRes.status,
          headers: Object.fromEntries(testRes.headers.entries()),
          bodySnippet: text.slice(0, 500)
        })
      } catch (err: any) {
        return NextResponse.json({
          debug: true,
          error: err?.message,
          stack: err?.stack
        })
      }
    }

    const symbol = searchParams.get('symbol') || searchParams.get('q') || undefined
    const marketParam = (searchParams.get('market') || 'ALL').toUpperCase()
    const validMarkets = ['TW', 'US', 'JP', 'KR', 'OTHER', 'ALL'] as const
    const market = validMarkets.includes(marketParam as any) ? (marketParam as (typeof validMarkets)[number]) : 'ALL'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '500', 10), 1), 1000)
    const isRefresh = searchParams.get('refresh') === '1' || searchParams.get('nocache') === '1'

    const data = await fetchEarningsCalls({
      symbol,
      market,
      limit,
      bypassCache: isRefresh
    })

    return NextResponse.json(
      {
        success: true,
        data
      },
      {
        headers: {
          'Cache-Control': isRefresh
            ? 'no-cache, no-store, must-revalidate'
            : 'public, s-maxage=300, stale-while-revalidate=600'
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
