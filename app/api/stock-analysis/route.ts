import { NextRequest, NextResponse } from 'next/server'

// API 設定 - 分開 host 和 port 避免解析問題
const AI_HEDGE_FUND_HOST = process.env.AI_HEDGE_FUND_HOST || 'dns.glsoft.ai'
const AI_HEDGE_FUND_PORT = process.env.AI_HEDGE_FUND_PORT || '6000'

// 預設核心分析師團隊 (涵蓋價值、成長、逆向、技術、基本面與情緒)
const DEFAULT_ANALYSTS = [
  'warren_buffett',
  'cathie_wood',
  'michael_burry',
  'technical_analyst',
  'valuation_analyst',
  'sentiment_analyst',
  'fundamentals_analyst',
  'wsb'
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tickers,
      selectedAnalysts,
      modelName,
      enableRoundTable = true,
      roundTableRounds = 1
    } = body

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
    
    const requestPayload: any = {
      tickers: tickers.toUpperCase(),
      selectedAnalysts: analysts,
      enableRoundTable,
      roundTableRounds
    }

    if (modelName) {
      requestPayload.modelName = modelName
    }

    console.log('📊 Stock Analysis Request:', {
      url: apiUrl.toString(),
      ...requestPayload
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
        body: JSON.stringify(requestPayload),
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
