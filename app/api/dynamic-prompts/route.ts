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

// 代理來源列表 (依序 fallback)
const PROXY_URLS = [
  'https://2md.aiurl.tw/https://stock.david888.com/',
  'https://2md.glsoft.ai/https://stock.david888.com/',
  'https://stock.david888.com/'
]

const ANSWERBOOK_MARKET_DATA = {
  us: [
    'https://answerbook.david888.com/SP500',
    'https://answerbook.david888.com/nasdaq100',
    'https://answerbook.david888.com/dowjones'
  ],
  tw: [
    'https://answerbook.david888.com/TW0050',
    'https://answerbook.david888.com/TW0051'
  ]
}

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
      sp500: [],
      tw50: [],
      twMid: []
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
    sp500,
    tw50,
    twMid
  }
}

function parseAnswerBookMarketPayload(payload: unknown): StockItem[] {
  if (!payload || typeof payload !== 'object') return []

  const marketMap = Object.values(payload as Record<string, unknown>).find(
    value => value && typeof value === 'object' && !Array.isArray(value)
  )
  if (!marketMap) return []

  return Object.entries(marketMap as Record<string, unknown>)
    .filter(([, name]) => typeof name === 'string')
    .map(([symbol, name]) => ({
      symbol: symbol.replace('.', '-'),
      name: name as string
    }))
}

async function fetchAnswerBookMarketData() {
  const requests = [
    ...ANSWERBOOK_MARKET_DATA.us.map(url => ({ market: 'US' as const, url })),
    ...ANSWERBOOK_MARKET_DATA.tw.map(url => ({ market: 'TW' as const, url }))
  ]

  const results = await Promise.allSettled(
    requests.map(async request => {
      const response = await fetch(request.url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
        cache: 'no-store'
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return {
        market: request.market,
        url: request.url,
        stocks: parseAnswerBookMarketPayload(await response.json())
      }
    })
  )

  const usStocks: StockItem[] = []
  const tw50: StockItem[] = []
  const twMid: StockItem[] = []

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    if (result.value.market === 'US') {
      usStocks.push(...result.value.stocks)
    } else if (result.value.url.endsWith('/TW0050')) {
      tw50.push(...result.value.stocks)
    } else {
      twMid.push(...result.value.stocks)
    }
  }

  return { usStocks, tw50, twMid }
}

function mergeCurrentPrices(
  catalog: StockItem[],
  scraped: StockItem[]
): StockItem[] {
  const scrapedBySymbol = new Map(
    scraped.map(stock => [stock.symbol.replace('.', '-'), stock])
  )
  const source = catalog.length > 0 ? catalog : scraped

  return source.map(stock => ({
    ...stock,
    price: scrapedBySymbol.get(stock.symbol)?.price
  }))
}

function buildPrompts(
  sp500: StockItem[],
  tw50: StockItem[],
  twMid: StockItem[]
) {
  const uniqueStocks = (stocks: StockItem[]) =>
    stocks.filter(
      (stock, index, all) =>
        stock.symbol &&
        all.findIndex(item => item.symbol === stock.symbol) === index
    )

  const twPool = uniqueStocks([...tw50, ...twMid])
  const usPool = uniqueStocks(sp500)

  const promptsZh: ExamplePrompt[] = [
    ...twPool.map((stock, index) => {
      const label = `${stock.name} (${stock.symbol})`
      const price = stock.price ? `（NT$${stock.price}）` : ''
      const templates = [
        {
          heading: `${label} 即時股價`,
          subheading: `查詢現價行情${price}`,
          message: `${stock.name} ${stock.symbol} 目前股價是多少？`
        },
        {
          heading: `${label} 走勢診斷`,
          subheading: '用波段、均線與成交量拆解走勢',
          message: `請分析${label}目前的趨勢、量價與支撐壓力`
        },
        {
          heading: `${label} 最新財務數據`,
          subheading: '查看營收、獲利與估值狀況',
          message: `請整理${label}最新財務數據與估值`
        },
        {
          heading: `${label} 供應鏈地圖`,
          subheading: '找出上下游與同產業連動標的',
          message: `請整理${label}的供應鏈與相關概念股`
        }
      ]
      return templates[index % templates.length]
    }),
    ...usPool.map((stock, index) => {
      const label = `${stock.name} (${stock.symbol})`
      const price = stock.price ? `（$${stock.price}）` : ''
      const templates = [
        {
          heading: `${label} 股票走勢圖`,
          subheading: '顯示即時走勢與技術線圖',
          message: `幫我顯示 ${stock.symbol} 的股票走勢圖表`
        },
        {
          heading: `${label} 最新財務數據`,
          subheading: `查看營收、獲利與估值${price}`,
          message: `請整理${label}最新財務數據與估值`
        },
        {
          heading: `${label} 大師觀點`,
          subheading: '多位投資大師圓桌分析',
          message: `請用多位投資大師分析${label}的投資價值`
        },
        {
          heading: `${label} 強弱如何？`,
          subheading: '趨勢、成交量與支撐壓力一次看',
          message: `請分析${label}目前的趨勢、量價與支撐壓力`
        }
      ]
      return templates[index % templates.length]
    }),
    {
      heading: '今日美股／台股市場熱力圖',
      subheading: '查看各產業板塊漲跌與篩選新標的',
      message: '今天股票市場各產業表現如何？'
    },
    {
      heading: '盤前新聞濃縮包',
      subheading: '整理可能影響台股與美股的財經重點',
      message: '請整理今天最重要的台股、美股與總經新聞'
    }
  ]

  const promptsEn: ExamplePrompt[] = [
    ...twPool.map((stock, index) => {
      const label = `${stock.name} (${stock.symbol})`
      const templates = [
        {
          heading: `${label} current price`,
          subheading: 'Live quote and market context',
          message: `What is the current price of ${label}?`
        },
        {
          heading: `${label} technical check`,
          subheading: 'Trend, volume, support and resistance',
          message: `Analyze the trend, volume, support and resistance for ${label}`
        },
        {
          heading: `${label} latest financials`,
          subheading: 'Revenue, earnings and valuation',
          message: `Summarize the latest financials and valuation for ${label}`
        },
        {
          heading: `${label} supply-chain map`,
          subheading: 'Related companies and industry links',
          message: `Map the supply chain and related companies for ${label}`
        }
      ]
      return templates[index % templates.length]
    }),
    ...usPool.map((stock, index) => {
      const label = `${stock.name} (${stock.symbol})`
      const templates = [
        {
          heading: `${label} stock chart`,
          subheading: 'Interactive price action and trends',
          message: `Show me a stock chart for ${label}`
        },
        {
          heading: `${label} latest financials`,
          subheading: 'Revenue, margins and balance sheet',
          message: `What are the latest financials and valuation for ${label}?`
        },
        {
          heading: `${label} investor view`,
          subheading: 'Multi-analyst investment perspective',
          message: `Give me a multi-analyst investment view of ${label}`
        },
        {
          heading: `${label} technical check`,
          subheading: 'Trend, volume, support and resistance',
          message: `Analyze the trend, volume, support and resistance for ${label}`
        }
      ]
      return templates[index % templates.length]
    }),
    {
      heading: 'Market overview by sector',
      subheading: "Today's performance heatmap",
      message: 'How is the stock market performing today by sector?'
    },
    {
      heading: 'Pre-market news brief',
      subheading: 'The stories moving Taiwan and US markets',
      message:
        'Summarize the most important Taiwan, US and macro market news today'
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
  const [upstreamResults, answerBookData] = await Promise.all([
    Promise.allSettled(
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
    ),
    fetchAnswerBookMarketData()
  ])

  const firstSuccessfulResult = upstreamResults.find(
    result => result.status === 'fulfilled'
  )
  if (firstSuccessfulResult?.status === 'fulfilled') {
    rawContent = firstSuccessfulResult.value
  }

  const scrapedStocks = parseStocks(rawContent)
  const sp500 = mergeCurrentPrices(answerBookData.usStocks, scrapedStocks.sp500)
  const tw50 = mergeCurrentPrices(answerBookData.tw50, scrapedStocks.tw50)
  const twMid = mergeCurrentPrices(answerBookData.twMid, scrapedStocks.twMid)
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
