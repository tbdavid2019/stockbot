import { evaluateSystemOne, type SystemOneOptions } from '../clef.ts'

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
  | 'showInstitutionalFlow'
  | 'showEconomicCalendar'
  | 'showEarningsCalls'
  | 'showStockPredictions'
  | 'showStockBrokerBranches'
  | 'showMarketInstitutionalLeaderboard'
  | 'showStockCompanyProfile'
  | 'showMacroRiskRegime'
  | 'showStockdataMacroDataset'
  | 'showPolymarketSentiment'

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

  const knownAliases: Record<string, string> = {
    SPACEX: 'SPCX',
    'SPACE X': 'SPCX',
    TSMC: '2330',
    台積電: '2330',
    鴻海: '2317',
    聯發科: '2454',
    聯電: '2303',
    輝達: 'NVDA',
    特斯拉: 'TSLA',
    蘋果: 'AAPL',
    微軟: 'MSFT',
    亞馬遜: 'AMZN',
    谷歌: 'GOOGL',
    臉書: 'META'
  }
  for (const [name, ticker] of Object.entries(knownAliases)) {
    if (new RegExp(name, 'i').test(text)) {
      return ticker
    }
  }

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
  // TradingView embed widget does not support Taiwan stock heatmaps (Chinese & English)
  if (
    /台股.{0,8}熱力圖|台灣.{0,8}熱力圖|熱力圖.{0,8}(?:台股|台灣)|taiwan.{0,15}heatmap|heatmap.{0,15}taiwan|taiex.{0,15}heatmap|heatmap.{0,15}taiex/i.test(
      content
    )
  ) {
    return undefined
  }
  if (/熱力圖|heatmap/i.test(content)) return 'showMarketHeatmap'
  if (/選股器|篩選器|screener/i.test(content)) return 'showStockScreener'
  if (
    /熱門股|漲幅榜|跌幅榜|成交量榜|trending stocks|top gainers/i.test(content)
  ) {
    return 'showTrendingStocks'
  }
  if (
    /(?:市場概況|market overview|總經市場|(?:台股|大盤).*(?:概況|總覽)|taiwan.*(?:overview|market)|taiex.*(?:overview|market))/i.test(
      content
    ) &&
    !resolvedTicker
  ) {
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
    /Polymarket|預測市場|real[- ]money odds|prediction market/i.test(content)
  ) {
    return 'showPolymarketSentiment'
  }
  if (
    /FedWatch|聯準會.*(?:利率|降息|升息).*機率|FOMC.*機率|fed rate odds|利率決策機率|美股財報行事曆|美股財報日曆|US earnings calendar/i.test(
      content
    )
  ) {
    return 'showStockdataMacroDataset'
  }
  if (
    /(?:Stockdata|外部量化).*(?:經濟日曆|商品)|(?:黃金|銅|WTI|原油).*(?:Stockdata|外部|摘要)|commodities summary/i.test(
      content
    )
  ) {
    return 'showStockdataMacroDataset'
  }
  if (
    /市場曝險|投資曝險|宏觀風控|風險 Regime|risk regime|recommended exposure|建議曝險/i.test(
      content
    )
  ) {
    return 'showMacroRiskRegime'
  }
  if (
    /TimesFM|LSTM|玄鐵|共振|預測排行|預測軌跡|模型選股|批次快照|top picks|forecast ranking/i.test(
      content
    )
  ) {
    return 'showStockPredictions'
  }
  if (
    /公司簡介|公司做什麼|做什麼的公司|主要做什麼|從事什麼業務|核心業務|業務內容|營業內容|產品服務|商業模式|靠什麼賺錢|business profile|company profile|公司新聞/i.test(
      content
    )
  ) {
    return 'showStockCompanyProfile'
  }
  if (
    /因子|風格輪動|資產配置|80\/20|60\/40|股債平衡|雙動能|fama[- ]french|factor\s*regime|asset\s*allocation/i.test(
      content
    )
  ) {
    return 'showMacroFactorRegime'
  }
  if (
    /經濟日曆|總經日曆|財經日曆|非農|PMI|CPI公布|央行決議|economic\s*calendar|macro\s*calendar|重大總經|總經數據|盤前走勢|盤前期貨|(?:大宗商品|美債殖利率|原油黃金|黃金原油).{0,12}(?:走勢|行情|概況)/i.test(
      content
    )
  ) {
    return 'showEconomicCalendar'
  }

  if (
    /法說|法人說明會|法人電話會議|財報電話會議|earnings\s*calls?|investor\s*conference|法說日程|法說簡報|法說行事曆|業績說明會|業績發表會|業績會|業績發布會|webcast/i.test(
      content
    )
  ) {
    return 'showEarningsCalls'
  }

  if (
    !resolvedTicker &&
    /全市場|哪些股票|排行|買超前|賣超前|institutional leaders|top institutional/i.test(
      content
    ) &&
    /法人|外資|投信|自營商|institutional/i.test(content)
  ) {
    return 'showMarketInstitutionalLeaderboard'
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
    /券商分點|主力分點|分點進出|券商買賣|broker branch|broker trades|dealer activity/i.test(
      content
    )
  ) {
    return 'showStockBrokerBranches'
  }
  if (
    /三大法人|法人買賣超|法人籌碼|外資買賣超|外資持股|投信連買|投信買賣超|投信持股|自營商|土洋對作|土洋同買|法人動向|籌碼面|籌碼分析|institutional\s*(?:flow|investor)/i.test(
      content
    )
  ) {
    return 'showInstitutionalFlow'
  }

  if (
    /多位.*大師|投資大師|大師分析|大師觀點|(?:1[3-6]|16)\s*位|\d+\s*位.*大師|值得買|該買嗎|值得投資|適合投資|投資價值|投資評估|multi[- ]analyst|investor view|should i buy|worth buying/i.test(
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

  // A bare company name or ticker inquiry with no further question intent
  // is treated as a company profile request.
  if (
    resolvedTicker &&
    content.trim().length <= 10 &&
    !/[?？嗎呢如何怎樣麼什麽誰]/.test(content) &&
    isPlausibleFinancialQuery(content, resolvedTicker)
  ) {
    return 'showStockCompanyProfile'
  }

  return undefined
}

/**
 * Fast local check to filter out greetings, plain conversational banter,
 * and unrelated tasks (rewriting, translation, general questions)
 * before making any external System One semantic routing requests.
 */
export function isPlausibleFinancialQuery(
  content: string,
  resolvedTicker?: string
): boolean {
  const trimmed = content.trim()
  if (!trimmed || trimmed.length < 2) return false

  // Fast-path ignore obvious conversational greetings and short non-financial chatter,
  // even if a ticker was inherited from prior conversation context.
  if (
    /^(?:hi|hello|hey|yo|你好|您好|哈囉|早安.*|午安.*|晚安.*|嗨|嗨囉|謝謝(?:你|您)?|多謝|感謝(?:你|您)?|thanks?(?:\s+you)?|thx|ok|okay|bye|再見|掰掰|你是誰|你能做什麼|說明|help)[!！。~～\s]*$/i.test(
      trimmed
    )
  ) {
    return false
  }

  // 1. Explicit ticker symbols or recognized market assets in the message (e.g. AAPL, NVDA, TSLA, 2330)
  // Uses extractExplicitTicker to safely exclude single-letter pronouns like "I" or non-ticker words.
  if (extractExplicitTicker(trimmed)) {
    return true
  }

  // 2. English financial terminology
  if (
    /\b(?:stocks?|charts?|prices?|quotes?|financials?|earnings|revenue|margins?|valuations?|values?|intrinsic|dividends?|options?|calls?|puts?|macro|crypto|markets?|bullish|bearish|shares?|nasdaq|nyse|twse|tpex|sec|10-k|10-q|dcf|pe|pb|ps|roe|eps|fcf|capex|ebitda|yields?|fed|cpi|ppi|gdp|pmi|ipo|target\s*prices?|peers?|competitors?|falsif\w*|thesis|catalysts?|moats?|risks?|forecasts?|outlooks?)\b/i.test(
      trimmed
    )
  ) {
    return true
  }

  // 3. Chinese financial, corporate, valuation, and market keywords
  if (
    /股|市|盤|價|息|幣|金|債|買|賣|單|券|估|值|盈|損|營|利|財|報|線|率|比|長|跌|漲|衝|空|多|宏觀|傳導|指數|期貨|選擇權|期權|總經|外資|投信|法人|籌碼|大師|巴菲特|彼得林區|達里歐|芒格|費雪|索羅斯|葛拉漢|席格|歐尼爾|米奈爾維尼|波克夏|ETF|DCF|ROE|EPS|P\/E|P\/B|P\/S|YOY|QOQ|CAGR|公司|企業|業務|競爭|同業|對手|產品|護城河|風險|展望|前景|標的|投資|持股|建倉|加碼|減碼|停損|停利|證偽|論點|假說|檔|賺|賠|趨勢|走勢|行情|表現|評價|分析|熱力圖|選股|日曆|優勢|客戶|供應鏈/i.test(
      trimmed
    )
  ) {
    return true
  }

  return false
}

/**
 * Tier 1.5 Semantic Tool Intent Gatekeeper powered by Clef-Flash System One
 * Evaluates ambiguous or conversational natural language questions within ~190ms
 * and maps high-confidence classifications directly to DeterministicToolName.
 */
export async function inferSemanticToolWithClef(
  content: string,
  resolvedTicker?: string,
  options?: SystemOneOptions
): Promise<DeterministicToolName | undefined> {
  const trimmed = content.trim()
  if (!trimmed || trimmed.length < 2) return undefined

  if (!isPlausibleFinancialQuery(trimmed, resolvedTicker)) {
    return undefined
  }

  try {
    const res = await evaluateSystemOne(
      {
        model: 'clef-flash',
        state: {
          userQuery: trimmed,
          resolvedTicker: resolvedTicker || null
        },
        questions: {
          intent: {
            type: 'choice',
            instructions: '使用者問題最符合哪一個金融意圖？',
            criteria: {
              financial_metric: '查詢特定財務指標、比率、營收、毛利、本益比、EPS、負債、現金流',
              company_valuation: '計算內在價值、合理價、估值模型、DCF折現',
              institutional_flow: '查詢三大法人籌碼、外資買賣超、投信連買、主力動向',
              master_analysis: '多位傳奇大師分析、投資價值評估、該買嗎、值不值得投資',
              stock_chart: '查看股價K線走勢圖、技術線型、支撐壓力',
              stock_price: '查看即時股價、行情、盤中報價',
              stock_news: '查詢最新重大財經新聞、突發消息、法說會動態',
              company_profile: '詢問公司是做什麼的、核心業務、產品服務、商業模式',
              transmission_chain: '總經或突發事件傳導鏈、產業鏈連鎖反應分析',
              signal_tracker: '投資論點演化、訊號追蹤、邏輯證偽檢驗',
              economic_calendar: '查詢非農、CPI公布、聯準會降息等全球總經日曆',
              macro_factor: '資產配置、股債平衡、因子輪動、宏觀風控',
              options_payoff: '選擇權/期權策略損益模擬曲線',
              sepa_strategy: 'SEPA動能策略、VCP型態、突破買點分析',
              market_overview: '整體大盤走勢、市場概況、熱門榜',
              earnings_call: '查詢法人說明會日程、法說簡報、財報電話會議、影音Webcast直播',
              other_general: '其他一般對話或不明確問題'
            }
          }
        }
      },
      {
        timeoutMs: options?.timeoutMs || 450,
        totalTimeoutMs: options?.totalTimeoutMs || 800,
        openAiApiKey: options?.openAiApiKey,
        typesafeApiKey: options?.typesafeApiKey
      }
    )

    const answer = res?.answers?.intent
    if (!answer || answer.type !== 'choice') return undefined

    // Accept classifications with valid finite confidence >= 0.72
    if (
      typeof answer.confidence !== 'number' ||
      !Number.isFinite(answer.confidence) ||
      answer.confidence < 0.72
    ) {
      return undefined
    }

    const choice = answer.choice
    switch (choice) {
      case 'financial_metric':
        return resolvedTicker ? 'answerFinancialMetric' : undefined
      case 'company_valuation':
        return resolvedTicker ? 'calculateCompanyValuation' : undefined
      case 'institutional_flow':
        return resolvedTicker ? 'showInstitutionalFlow' : 'showMarketInstitutionalLeaderboard'
      case 'master_analysis':
        return resolvedTicker ? 'analyzeStockWithAI' : undefined
      case 'stock_chart':
        return resolvedTicker ? 'showStockChart' : undefined
      case 'stock_price':
        return resolvedTicker ? 'showStockPrice' : undefined
      case 'stock_news':
        return resolvedTicker ? 'showStockNews' : undefined
      case 'company_profile':
        return resolvedTicker ? 'showStockCompanyProfile' : undefined
      case 'transmission_chain':
        return 'showTransmissionChain'
      case 'signal_tracker':
        return resolvedTicker ? 'trackInvestmentSignal' : undefined
      case 'economic_calendar':
        return 'showEconomicCalendar'
      case 'macro_factor':
        return 'showMacroFactorRegime'
      case 'options_payoff':
        return resolvedTicker ? 'simulateOptionsPayoff' : undefined
      case 'sepa_strategy':
        return resolvedTicker ? 'analyzeSepaStrategy' : undefined
      case 'market_overview':
        return 'showMarketOverview'
      case 'earnings_call':
        return 'showEarningsCalls'
      default:
        return undefined
    }
  } catch (err) {
    console.warn('[Clef Semantic Routing] Failed or timed out:', err)
    return undefined
  }
}
