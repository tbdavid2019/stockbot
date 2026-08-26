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

// 簡易記憶體快取 (1小時快取)
let cachedData: {
  timestamp: number
  usStocks: StockItem[]
  twStocks: StockItem[]
  promptsZh: ExamplePrompt[]
  promptsEn: ExamplePrompt[]
} | null = null

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function parseStocks(content: string): { usStocks: StockItem[]; twStocks: StockItem[] } {
  const usStocks: StockItem[] = []
  const twStocks: StockItem[] = []

  if (!content) {
    return { usStocks: DEFAULT_US_STOCKS, twStocks: DEFAULT_TW_STOCKS }
  }

  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 匹配台股：例如 "2330.TW 台積電       2400.00" 或 "2330 台積電"
    const twMatch = line.match(/^(\d{4})(?:\.TW)?\s+([\u4e00-\u9fa5A-Za-z0-9]+)\s+([\d.]+)?/)
    if (twMatch) {
      const [, symbol, name, price] = twMatch
      if (!twStocks.some(s => s.symbol === symbol)) {
        twStocks.push({ symbol, name, price, raw: `${symbol} ${name}` })
      }
      continue
    }

    // 匹配美股：例如 "NVDA               213.05" 或 "BRK-B              504.32"
    const usMatch = line.match(/^([A-Z]{1,5}(?:-[A-Z]+)?)\s+([\d.]+)\s+[\d.-]+/i)
    if (usMatch) {
      const symbol = usMatch[1].toUpperCase()
      const price = usMatch[2]
      const blacklist = ['PE', 'PB', 'EV', 'MA', 'CODE', 'DATE', 'PRICE', 'HIGH', 'LOW']
      if (!blacklist.includes(symbol) && !usStocks.some(s => s.symbol === symbol)) {
        usStocks.push({ symbol, name: symbol, price })
      }
    }
  }

  return {
    usStocks: usStocks.length > 0 ? usStocks : DEFAULT_US_STOCKS,
    twStocks: twStocks.length > 0 ? twStocks : DEFAULT_TW_STOCKS
  }
}

function buildPrompts(usStocks: StockItem[], twStocks: StockItem[]) {
  const tw1 = twStocks[0] || DEFAULT_TW_STOCKS[0]
  const tw2 = twStocks[1] || DEFAULT_TW_STOCKS[1]
  const us1 = usStocks[0] || DEFAULT_US_STOCKS[0]
  const us2 = usStocks[1] || DEFAULT_US_STOCKS[1]
  const us3 = usStocks[2] || DEFAULT_US_STOCKS[2]

  const promptsZh: ExamplePrompt[] = [
    {
      heading: `${tw1.name} (${tw1.symbol}) 現價`,
      subheading: `查詢 ${tw1.name} 即時行情${tw1.price ? ` ($${tw1.price})` : ''}`,
      message: `${tw1.name} ${tw1.symbol} 目前股價是多少？`
    },
    {
      heading: `查看 ${us1.symbol} 走勢圖`,
      subheading: `顯示 $${us1.symbol} 即時走勢與K線圖`,
      message: `幫我顯示 ${us1.symbol} 的股票走勢圖表`
    },
    {
      heading: `AI 投資多輪大師分析`,
      subheading: `${us2.symbol} 值得買嗎？AI 多輪評估`,
      message: `${us2.symbol} 值得買嗎？請用多位大師進行 AI 投資分析`
    },
    {
      heading: `${us3.symbol} 最新財務數據`,
      subheading: `查看 ${us3.symbol} 營收與財報指標`,
      message: `${us3.symbol} 最近的財務數據如何？`
    },
    {
      heading: '今日股票產業板塊表現',
      subheading: '查看各產業板塊熱力圖',
      message: '今天股票市場各產業表現如何？'
    },
    {
      heading: '股票篩選器',
      subheading: '尋找市場潛力新標的',
      message: '顯示股票篩選器來尋找新股票'
    }
  ]

  const promptsEn: ExamplePrompt[] = [
    {
      heading: `What is the price`,
      subheading: `of ${us1.symbol} stock?`,
      message: `What is the price of ${us1.symbol} stock?`
    },
    {
      heading: `Show me a stock chart`,
      subheading: `for $${us2.symbol}`,
      message: `Show me a stock chart for $${us2.symbol}`
    },
    {
      heading: `AI Investment Analysis`,
      subheading: `Should I buy ${us3.symbol}?`,
      message: `Should I buy ${us3.symbol}? Please provide multi-analyst AI investment analysis`
    },
    {
      heading: `What are ${us1.symbol}'s`,
      subheading: `latest financials?`,
      message: `What are ${us1.symbol}'s latest financials?`
    },
    {
      heading: 'How is the stock market',
      subheading: 'performing today by sector?',
      message: 'How is the stock market performing today by sector?'
    },
    {
      heading: 'Show me a screener',
      subheading: 'to find new stocks',
      message: 'Show me a screener to find new stocks'
    }
  ]

  return { promptsZh, promptsEn }
}

export async function GET() {
  const now = Date.now()

  // 若快取有效則直接回傳
  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedData)
  }

  let rawContent = ''

  for (const url of PROXY_URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockBot/1.0)'
        },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 3600 }
      })

      if (res.ok) {
        const text = await res.text()
        if (text && text.length > 200) {
          rawContent = text
          break
        }
      }
    } catch (e) {
      // 嘗試下一個代理
      continue
    }
  }

  const { usStocks, twStocks } = parseStocks(rawContent)
  const { promptsZh, promptsEn } = buildPrompts(usStocks, twStocks)

  cachedData = {
    timestamp: now,
    usStocks,
    twStocks,
    promptsZh,
    promptsEn
  }

  return NextResponse.json(cachedData)
}
