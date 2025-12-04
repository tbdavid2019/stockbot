import { NextRequest, NextResponse } from 'next/server'

// API 設定 - 分開 host 和 port 避免解析問題
const AI_HEDGE_FUND_HOST = process.env.AI_HEDGE_FUND_HOST || '46.51.245.98'
const AI_HEDGE_FUND_PORT = process.env.AI_HEDGE_FUND_PORT || '6000'

// 預設分析師列表 (參考 Python 範例)
const DEFAULT_ANALYSTS = [
  'ben_graham',
  'bill_ackman',
  'cathie_wood',
  'charlie_munger',
  'michael_burry',
  'peter_lynch',
  'phil_fisher',
  'warren_buffett',
  'nancy_pelosi',
  'wsb',
  'technical_analyst',
  'fundamentals_analyst',
  'sentiment_analyst',
  'valuation_analyst'
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tickers, selectedAnalysts, modelName = 'gpt-4o-mini' } = body

    if (!tickers) {
      return NextResponse.json(
        { error: '缺少股票代碼 (tickers)' },
        { status: 400 }
      )
    }

    // 如果沒有選擇分析師，使用預設列表
    const analysts = (selectedAnalysts && selectedAnalysts.length > 0) 
      ? selectedAnalysts 
      : DEFAULT_ANALYSTS

    // 建構 URL
    const apiUrl = new URL(`http://${AI_HEDGE_FUND_HOST}:${AI_HEDGE_FUND_PORT}/api/analysis`)
    
    console.log('📊 Stock Analysis Request:', {
      url: apiUrl.toString(),
      tickers: tickers.toUpperCase(),
      analysts: analysts,
      modelName
    })

    // 呼叫 AI Hedge Fund API (加入 AbortController 處理超時)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180000) // 180 秒超時

    try {
      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tickers: tickers.toUpperCase(),
          selectedAnalysts: analysts,
          modelName
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI Hedge Fund API error:', response.status, errorText)
        return NextResponse.json(
          { error: `API 錯誤: ${response.status} - ${errorText}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      console.log('✅ Analysis completed successfully')
      return NextResponse.json(data)

    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.error('API request timeout')
        return NextResponse.json(
          { error: '分析請求超時，請稍後再試（分析可能需要 30-60 秒）' },
          { status: 504 }
        )
      }
      throw fetchError
    }

  } catch (error: any) {
    console.error('Stock analysis error:', error)
    return NextResponse.json(
      { error: `分析服務錯誤: ${error.message || '請稍後再試'}` },
      { status: 500 }
    )
  }
}
