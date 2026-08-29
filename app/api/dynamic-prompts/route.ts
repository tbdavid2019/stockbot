import { NextResponse } from 'next/server'

interface StockItem {
  symbol: string
  name: string
  price?: string
  raw?: string
}

interface ExamplePrompt {
  heading: string
  subheading: string
  message: string
}

// 預設備用標的
const DEFAULT_TW_STOCKS: StockItem[] = [
  { symbol: '2330', name: '台積電', price: '2400' },
  { symbol: '2344', name: '華邦電', price: '179' },
  { symbol: '2882', name: '國泰金', price: '103' },
  { symbol: '1513', name: '中興電', price: '165.5' },
  { symbol: '1216', name: '統一', price: '77.4' }
]

const DEFAULT_US_STOCKS: StockItem[] = [
  { symbol: 'NVDA', name: 'NVDA', price: '213.05' },
  { symbol: 'AAPL', name: 'AAPL', price: '309.90' },
  { symbol: 'TSLA', name: 'TSLA', price: '220.00' },
  { symbol: 'MSFT', name: 'MSFT', price: '450.00' },
  { symbol: 'GOOGL', name: 'GOOGL', price: '180.00' },
  { symbol: 'AMZN', name: 'AMZN', price: '260.11' }
]

// 代理來源列表 (依序 fallback)
const PROXY_URLS = [
  'https://2md.aiurl.tw/https://stock.david888.com/',
  'https://2md.glsoft.ai/https://stock.david888.com/',
  'https://stock.david888.com/'
]

// 簡易記憶體快取 (5 分鐘快取，避免頁面顯示過期報價)
let cachedData: {
  timestamp: number
  usStocks: StockItem[]
  twStocks: StockItem[]
  promptsZh: ExamplePrompt[]
  promptsEn: ExamplePrompt[]
} | null = null

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const UPSTREAM_TIMEOUT_MS = 3500

function parseStocks(content: string): {
  sp500: StockItem[]
  tw50: StockItem[]
  twMid: StockItem[]
} {
  const sp500: StockItem[] = []
  const tw50: StockItem[] = []
  const twMid: StockItem[] = []

  if (!content) {
    return {
      sp500: DEFAULT_US_STOCKS,
      tw50: DEFAULT_TW_STOCKS,
      twMid: DEFAULT_TW_STOCKS
    }
  }

  const lines = content.split('\n')
  let currentCategory = 'SP500'

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.includes('SP500')) {
      currentCategory = 'SP500'
    } else if (trimmed.includes('台灣50')) {
      currentCategory = 'TW50'
    } else if (trimmed.includes('台灣中型100')) {
      currentCategory = 'TWMID'
    }

    const twMatch = trimmed.match(
      /^(\d{4})(?:\.TW)?\s+([\u4e00-\u9fa5A-Za-z0-9]+)\s+([\d.]+)?/
    )
    if (twMatch) {
      const [, symbol, name, price] = twMatch
      const item = { symbol, name, price, raw: `${symbol} ${name}` }
      if (currentCategory === 'TW50' && !tw50.some(s => s.symbol === symbol)) {
        tw50.push(item)
      } else if (
        currentCategory === 'TWMID' &&
        !twMid.some(s => s.symbol === symbol)
      ) {
        twMid.push(item)
      }
      continue
    }

    const usMatch = trimmed.match(
      /^([A-Z]{1,5}(?:-[A-Z]+)?)\s+([\d.]+)\s+[\d.-]+/i
    )
    if (usMatch) {
      const symbol = usMatch[1].toUpperCase()
      const price = usMatch[2]
      const blacklist = [
        'PE',
        'PB',
        'EV',
        'MA',
        'CODE',
        'DATE',
        'PRICE',
        'HIGH',
        'LOW'
      ]
      if (!blacklist.includes(symbol)) {
        const item = { symbol, name: symbol, price }
        if (
          currentCategory === 'SP500' &&
          !sp500.some(s => s.symbol === symbol)
        ) {
          sp500.push(item)
        }
      }
    }
  }

  return {
    sp500: sp500.length > 0 ? sp500 : DEFAULT_US_STOCKS,
    tw50: tw50.length > 0 ? tw50 : DEFAULT_TW_STOCKS,
    twMid: twMid.length > 0 ? twMid : DEFAULT_TW_STOCKS
  }
}

function buildPrompts(
  sp500: StockItem[],
  tw50: StockItem[],
  twMid: StockItem[]
) {
  const twTop1 = tw50[0] || DEFAULT_TW_STOCKS[0]
  const twTop2 = tw50[1] || DEFAULT_TW_STOCKS[1]
  const twMid1 = twMid[0] || DEFAULT_TW_STOCKS[3]

  const usTop1 = sp500[0] || DEFAULT_US_STOCKS[0]
  const usTop2 = sp500[1] || DEFAULT_US_STOCKS[1]
  const usTop3 = sp500[2] || DEFAULT_US_STOCKS[2]
  const usTop4 = sp500[3] || DEFAULT_US_STOCKS[3]

  const promptsZh: ExamplePrompt[] = [
    {
      heading: `${twTop1.name} (${twTop1.symbol}) 即時股價`,
      subheading: `查詢 ${twTop1.name} 現價行情${twTop1.price ? ` ($${twTop1.price})` : ''}`,
      message: `${twTop1.name} ${twTop1.symbol} 目前股價是多少？`
    },
    {
      heading: `查看 ${usTop1.symbol} 股票走勢圖`,
      subheading: `顯示 $${usTop1.symbol} 即時走勢與技術線圖`,
      message: `幫我顯示 ${usTop1.symbol} 的股票走勢圖表`
    },
    {
      heading: `大師分析 ${usTop2.symbol} 值得買嗎？`,
      subheading: `由巴菲特等大師多輪圓桌委員會評估`,
      message: `${usTop2.symbol} 值得買嗎？請用多位大師進行 AI 投資分析`
    },
    {
      heading: `${usTop3.symbol} 最新財務數據`,
      subheading: `查看 ${usTop3.symbol} 營收與財報獲利狀況`,
      message: `${usTop3.symbol} 最近的財務數據如何？`
    },
    {
      heading: `${twMid1.name} (${twMid1.symbol}) 中型潛力分析`,
      subheading: `中型100潛力標的${twMid1.price ? ` ($${twMid1.price})` : ''}`,
      message: `${twMid1.name} ${twMid1.symbol} 財務狀況與投資評價如何？`
    },
    {
      heading: '今日美股/台股市場熱力圖',
      subheading: '查看各產業板塊漲跌與篩選新標的',
      message: '今天股票市場各產業表現如何？'
    }
  ]

  const promptsEn: ExamplePrompt[] = [
    {
      heading: `What is the price of ${usTop1.symbol}?`,
      subheading: `Current price${usTop1.price ? ` ($${usTop1.price})` : ''}`,
      message: `What is the price of ${usTop1.symbol} stock?`
    },
    {
      heading: `Show me ${usTop2.symbol} stock chart`,
      subheading: `Interactive candlestick chart & trends`,
      message: `Show me a stock chart for $${usTop2.symbol}`
    },
    {
      heading: `AI Analysis: Should I buy ${usTop3.symbol}?`,
      subheading: `Multi-analyst round table debate`,
      message: `Should I buy ${usTop3.symbol}? Please provide multi-analyst AI investment analysis`
    },
    {
      heading: `${usTop4.symbol} latest financials`,
      subheading: `Revenue, margins & balance sheet`,
      message: `What are ${usTop4.symbol}'s latest financials?`
    },
    {
      heading: `Taiwan TSMC (${twTop1.symbol}) Analysis`,
      subheading: `Global semiconductor leader ($${twTop1.price || '2400'})`,
      message: `What is the current stock price and outlook for TSMC (${twTop1.symbol})?`
    },
    {
      heading: 'Market Overview by Sector',
      subheading: `Today's performance heatmap`,
      message: 'How is the stock market performing today by sector?'
    }
  ]

  return { promptsZh, promptsEn }
}

export async function GET() {
  const now = Date.now()

  // 若快取有效則直接回傳
  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData, {
      headers: { 'Cache-Control': 'no-store' }
    })
  }

  let rawContent = ''

  // Probe all upstreams in parallel. Sequential 5s retries can exceed the
  // serverless request window and turn a recoverable upstream failure into a
  // 504 for the entire homepage.
  const upstreamResults = await Promise.allSettled(
    PROXY_URLS.map(async url => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockBot/1.0)'
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: 'no-store'
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (!text || text.length <= 200)
        throw new Error('Empty upstream response')
      return text
    })
  )

  const firstSuccessfulResult = upstreamResults.find(
    result => result.status === 'fulfilled'
  )
  if (firstSuccessfulResult?.status === 'fulfilled') {
    rawContent = firstSuccessfulResult.value
  }

  const { sp500, tw50, twMid } = parseStocks(rawContent)
  const { promptsZh, promptsEn } = buildPrompts(sp500, tw50, twMid)

  cachedData = {
    timestamp: now,
    usStocks: sp500,
    twStocks: [...tw50, ...twMid],
    promptsZh,
    promptsEn
  }

  return NextResponse.json(cachedData, {
    headers: { 'Cache-Control': 'no-store' }
  })
}
