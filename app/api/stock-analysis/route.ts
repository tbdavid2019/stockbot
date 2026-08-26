// Vercel Serverless Function 執行時間設定 (允許最多 60 秒)
export const maxDuration = 60
export const dynamic = 'force-dynamic'

// API 設定 - 分開 host 和 port 避免解析問題
const AI_HEDGE_FUND_HOST = process.env.AI_HEDGE_FUND_HOST || 'dns.glsoft.ai'
const AI_HEDGE_FUND_PORT = process.env.AI_HEDGE_FUND_PORT || '6000'
const AI_HEDGE_FUND_FALLBACK_HOST = '46.51.245.98'

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
    const timeoutId = setTimeout(() => controller.abort(), 55000) // 55 秒超時 (在 Vercel 60s 內完成)

    let response: Response | null = null
    let lastErrorText: string = ''

    const hostsToTry = [AI_HEDGE_FUND_HOST, AI_HEDGE_FUND_FALLBACK_HOST].filter(Boolean)

    for (const host of hostsToTry) {
      try {
        const apiUrl = `http://${host}:${AI_HEDGE_FUND_PORT}/api/analysis`
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        })

        if (res.ok) {
          response = res
          break
        } else {
          lastErrorText = await res.text()
          console.warn(`⚠️ API response not ok from ${host}: ${res.status} - ${lastErrorText}`)
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          clearTimeout(timeoutId)
          return NextResponse.json(
            { error: 'AI 分析請求逾時（超過 55 秒），請稍後再試。' },
            { status: 504 }
          )
        }
        console.warn(`⚠️ Fetch failed for ${host}: ${fetchError.message}`)
      }
    }

    clearTimeout(timeoutId)

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: lastErrorText || '無法連線至 AI 分析後端服務，請確認伺服器狀態。' },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log('✅ Analysis completed successfully')
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Stock analysis error:', error)
    return NextResponse.json(
      { error: `分析服務錯誤: ${error.message || '請稍後再試'}` },
      { status: 500 }
    )
  }
}
