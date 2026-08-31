export type DeterministicToolName =
  | 'showStockChart'
  | 'showStockPrice'
  | 'answerFinancialMetric'
  | 'showStockFinancials'
  | 'showStockNews'
  | 'showStockScreener'
  | 'showMarketOverview'
  | 'showMarketHeatmap'
  | 'showETFHeatmap'
  | 'showTrendingStocks'
  | 'analyzeStockWithAI'
  | 'calculateCompanyValuation'
  | 'analyzeSepaStrategy'
  | 'previewEarnings'
  | 'simulateOptionsPayoff'
  | 'analyzeEtfPremium'
  | 'analyzeStockLiquidity'
  | 'showTransmissionChain'
  | 'trackInvestmentSignal'
  | 'showMacroFactorRegime'

const NON_TICKER_WORDS = new Set([
  'AI',
  'CAGR',
  'CEO',
  'CFO',
  'DCF',
  'EBIT',
  'EBITDA',
  'EPS',
  'ETF',
  'FCF',
  'FED',
  'GDP',
  'GAAP',
  'IPO',
  'LTM',
  'LLM',
  'NTM',
  'PDF',
  'QOQ',
  'ROE',
  'ROIC',
  'SEC',
  'TTM',
  'YOY',
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
  if (
    /傳導鏈|傳導分析|連鎖反應|產業鏈傳導|事件傳導|宏觀傳導|transmission\s*(?:chain)?/i.test(
      content
    )
  ) {
    return 'showTransmissionChain'
  }
  if (
    /訊號追蹤|訊號演化|邏輯證偽|證偽|論點驗證|signal\s*track(?:er)?|thesis\s*validation/i.test(
      content
    )
  ) {
    return 'trackInvestmentSignal'
  }
  if (
    /因子|風格輪動|資產配置|80\/20|60\/40|股債平衡|雙動能|fama[- ]french|factor\s*regime|asset\s*allocation/i.test(
      content
    )
  ) {
    return 'showMacroFactorRegime'
  }

  if (!resolvedTicker) return undefined

  if (
    /合理價|內在價值|估值模型|估值分析|DCF|WACC|fair value|intrinsic value|valuation/i.test(
      content
    )
  ) {
    return 'calculateCompanyValuation'
  }
  if (
    /SEPA|趨勢模板|VCP|stage\s*[1-4]|買點|突破買入|trend template|position sizing/i.test(
      content
    )
  ) {
    return 'analyzeSepaStrategy'
  }
  if (
    /財報前瞻|財報預測|財報預期|earnings preview|earnings estimate|when is .* earnings|分析師共識/i.test(
      content
    )
  ) {
    return 'previewEarnings'
  }
  if (
    /選擇權|期權|options?\s+(?:payoff|profit|loss|strategy)|損益模擬|損益曲線|black.scholes/i.test(
      content
    )
  ) {
    return 'simulateOptionsPayoff'
  }
  if (
    /ETF.{0,12}(溢價|折價|溢折價|NAV|淨值)|(?:溢價|折價|溢折價).{0,12}ETF|premium.{0,12}NAV|discount.{0,12}NAV/i.test(
      content
    )
  ) {
    return 'analyzeEtfPremium'
  }
  if (
    /流動性|市場衝擊|滑價|滑點|Amihud|market impact|liquidity|float turnover/i.test(
      content
    )
  ) {
    return 'analyzeStockLiquidity'
  }

  if (
    /多位.*大師|投資大師|大師分析|大師觀點|13\s*位|值得買|該買嗎|值得投資|適合投資|投資價值|投資評估|multi[- ]analyst|investor view|should i buy|worth buying/i.test(
      content
    )
  ) {
    return 'analyzeStockWithAI'
  }
  if (
    /走勢圖|股票圖|技術線圖|技術圖|k\s*線|線圖|趨勢|量價|支撐|壓力|技術分析|stock chart|price chart|trend|support|resistance/i.test(
      content
    )
  ) {
    return 'showStockChart'
  }
  if (
    /\b(?:EBITDA|EBIT|EPS|FCF|ROE|ROIC|P\/?E|P\/?B|P\/?S|PEG|DCF|CAGR|YOY|QOQ|TTM|LTM|NTM|EV(?:\s*\/\s*[A-Z]+)?|[A-Z]+\s+(?:margin|ratio|yield|growth|turnover)|revenue|gross profit|operating income|net income|free cash flow|capex|working capital|receivables?|inventory|debt|cash and equivalents|book value|dividend)\b|(?:率|比率|倍數|週轉率|年增|季增|成長|衰退|財報科目|營運指標|估值指標|營收|毛利|營業利益|稅後淨利|現金流|資本支出|營運資金|應收帳款|存貨|負債|現金|股利)|自由現金流|每股盈餘|本益比|股價淨值比|股價營收比|企業價值|營業利益率|淨利率|毛利率|負債權益比|流動比率|速動比率|殖利率/i.test(
      content
    )
  ) {
    return 'answerFinancialMetric'
  }
  if (
    /最新財務|財務數據|財務狀況|財報|營收|獲利|毛利|現金流|資產負債|financials|earnings|balance sheet|cash flow/i.test(
      content
    )
  ) {
    return 'answerFinancialMetric'
  }
  if (/新聞|消息|重大事件|近期動態|stock news|latest news/i.test(content)) {
    return 'showStockNews'
  }
  if (/股價|報價|現價|行情|current price|stock price|quote/i.test(content)) {
    return 'showStockPrice'
  }

  return undefined
}
