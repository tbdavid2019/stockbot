import { NextRequest, NextResponse } from 'next/server'

const AI_HEDGE_FUND_API_URL = process.env.AI_HEDGE_FUND_API_URL || 'http://46.51.245.98:6000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tickers, selectedAnalysts = [], modelName = 'gpt-4o' } = body

    if (!tickers) {
      return NextResponse.json(
        { error: '缺少股票代碼 (tickers)' },
        { status: 400 }
      )
    }

    // 呼叫 AI Hedge Fund API
    const response = await fetch(`${AI_HEDGE_FUND_API_URL}/api/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tickers: tickers.toUpperCase(),
        selectedAnalysts,
        modelName
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI Hedge Fund API error:', errorText)
      return NextResponse.json(
        { error: `API 錯誤: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Stock analysis error:', error)
    return NextResponse.json(
      { error: '分析服務暫時無法使用，請稍後再試' },
      { status: 500 }
    )
  }
}
