export type DeterministicToolName =
  | 'showStockChart'
  | 'showStockPrice'
  | 'showStockFinancials'
  | 'showStockNews'
  | 'showStockScreener'
  | 'showMarketOverview'
  | 'showMarketHeatmap'
  | 'showETFHeatmap'
  | 'showTrendingStocks'
  | 'analyzeStockWithAI'

const NON_TICKER_WORDS = new Set([
  'AI',
  'CEO',
  'CFO',
  'ETF',
  'FED',
  'GDP',
  'IPO',
  'LLM',
  'PDF',
  'ROE',
  'SEC',
  'USD'
])

export function extractExplicitTicker(text: string): string | undefined {
  const qualified = text.match(
    /\b(?:NASDAQ|NYSE|AMEX|BATS|ARCA|TWSE|TPEX|HKEX|SSE|SZSE|TSE|KRX):[A-Z0-9.-]+\b/i
  )?.[0]
  if (qualified) return qualified.toUpperCase()

  const labelled = text.match(
    /(?:股票代號|ticker|symbol)\s*[:：]?\s*\$?([A-Z]{1,6}(?:[.-][A-Z0-9]+)?|\d{4,6})\b/i
  )?.[1]
  if (labelled) return labelled.toUpperCase()

  const bracketed = text.match(
    /[（(]\s*([A-Z]{1,6}(?:[.-][A-Z0-9]+)?|\d{4,6})\s*[）)]/i
  )?.[1]
  if (bracketed) return bracketed.toUpperCase()

  const cashtag = text.match(/\$([A-Z]{1,6}(?:[.-][A-Z0-9]+)?)\b/i)?.[1]
  if (cashtag) return cashtag.toUpperCase()

  const taiwanCode = text.match(/(?:^|\s)(\d{4})(?:\s|$)/)?.[1]
  if (taiwanCode) return taiwanCode

  const uppercaseTokens = text.match(/\b[A-Z]{2,6}(?:[.-][A-Z0-9]+)?\b/g)
  return uppercaseTokens
    ?.map(token => token.toUpperCase())
    .find(token => !NON_TICKER_WORDS.has(token))
}

export function resolveTickerFromMessages(
  currentContent: string,
  messages: Array<{ content: unknown }>
): string | undefined {
  const currentTicker = extractExplicitTicker(currentContent)
  if (currentTicker) return currentTicker

  for (const message of [...messages].reverse()) {
    if (Array.isArray(message.content)) {
      for (const item of [...message.content].reverse()) {
        if (!item || typeof item !== 'object') continue
        const record = item as Record<string, any>
        const symbol = record.args?.symbol || record.result?.symbol
        if (typeof symbol === 'string' && symbol.trim()) {
          return symbol.trim().toUpperCase()
        }
      }
    }

    if (typeof message.content === 'string') {
      const ticker = extractExplicitTicker(message.content)
      if (ticker) return ticker
    }
  }

  return undefined
}

export function inferDeterministicTool(
  content: string,
  resolvedTicker?: string
): DeterministicToolName | undefined {
  if (/etf.{0,12}(熱力圖|heatmap)|(熱力圖|heatmap).{0,12}etf/i.test(content)) {
    return 'showETFHeatmap'
  }
  if (/熱力圖|heatmap/i.test(content)) return 'showMarketHeatmap'
  if (/選股器|篩選器|screener/i.test(content)) return 'showStockScreener'
  if (
    /熱門股|漲幅榜|跌幅榜|成交量榜|trending stocks|top gainers/i.test(content)
  ) {
    return 'showTrendingStocks'
  }
  if (/市場概況|market overview|總經市場/i.test(content) && !resolvedTicker) {
    return 'showMarketOverview'
  }

  if (!resolvedTicker) return undefined

  if (
    /多位.*大師|投資大師|大師分析|大師觀點|13\s*位|值得買|該買嗎|值得投資|適合投資|投資價值|投資評估|multi[- ]analyst|investor view|should i buy|worth buying/i.test(
      content
    )
  ) {
    return 'analyzeStockWithAI'
  }
  if (
    /走勢圖|股票圖|技術線圖|技術圖|k\s*線|線圖|stock chart|price chart/i.test(
      content
    )
  ) {
    return 'showStockChart'
  }
  if (
    /最新財務|財務數據|財務狀況|財報|營收|獲利|毛利|現金流|資產負債|financials|earnings|balance sheet|cash flow/i.test(
      content
    )
  ) {
    return 'showStockFinancials'
  }
  if (/新聞|消息|重大事件|近期動態|stock news|latest news/i.test(content)) {
    return 'showStockNews'
  }
  if (/股價|報價|現價|行情|current price|stock price|quote/i.test(content)) {
    return 'showStockPrice'
  }

  return undefined
}
