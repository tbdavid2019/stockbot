import 'server-only'

import { generateText } from 'ai'
import {
  createAI,
  getMutableAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { createOpenAI } from '@ai-sdk/openai'

import { BotCard, BotMessage } from '@/components/stocks/message'

import { z } from 'zod'
import { nanoid, formatStockSymbol } from '@/lib/utils'
import { SpinnerMessage } from '@/components/stocks/message'
import { Message } from '@/lib/types'
import { StockChart } from '@/components/tradingview/stock-chart'
import { StockPrice } from '@/components/tradingview/stock-price'
import { StockNews } from '@/components/tradingview/stock-news'
import { StockFinancials } from '@/components/tradingview/stock-financials'
import { StockScreener } from '@/components/tradingview/stock-screener'
import { MarketOverview } from '@/components/tradingview/market-overview'
import { MarketHeatmap } from '@/components/tradingview/market-heatmap'
import { MarketTrending } from '@/components/tradingview/market-trending'
import { ETFHeatmap } from '@/components/tradingview/etf-heatmap'
import { StockAnalysis } from '@/components/tradingview/stock-analysis'
import { NativeFinancialsCard } from '@/components/stocks/native-financials-card'
import { NativeStockNewsCard } from '@/components/stocks/native-news-card'
import { WebSearchResults } from '@/components/stocks/web-search-results'
import { WikiPublishResultCard } from '@/components/stocks/wiki-publish-result'
import { FinancialReportCard } from '@/components/stocks/financial-report-card'
import { BotCaption } from '@/components/stocks/bot-caption'
import { searchWeb2MD, readUrl2MD } from '@/lib/2md'
import { publishToWiki } from '@/lib/wiki'
import { toast } from 'sonner'
import {
  inferDeterministicTool,
  resolveTickerFromMessages
} from '@/lib/chat/routing'

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

interface MutableAIState {
  update: (newState: any) => void
  done: (newState: any) => void
  get: () => AIState
}

interface ProviderCandidate {
  name: string
  baseURL: string
  apiKey: string
  model: string // 伴隨說明文字與摘要生成模型 (Caption / Chat Model)
  toolModel: string // 工具調用與意圖分流模型 (Function Calling / Tool Model)
}

function getProviderCandidates(userKey?: string): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = []

  // 0. 前端使用者傳入之 API Key (User Client Key - Groq / OpenAI / Gemini)
  if (userKey && typeof userKey === 'string' && userKey.trim().length > 5) {
    const trimmedKey = userKey.trim()
    if (trimmedKey.startsWith('gsk_')) {
      candidates.push({
        name: `User Client Groq Key [openai/gpt-oss-20b]`,
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: trimmedKey,
        model: 'openai/gpt-oss-20b',
        toolModel: 'openai/gpt-oss-20b'
      })
    } else if (trimmedKey.startsWith('sk-')) {
      candidates.push({
        name: `User Client OpenAI Key [gpt-4o-mini]`,
        baseURL: 'https://api.openai.com/v1',
        apiKey: trimmedKey,
        model: 'gpt-4o-mini',
        toolModel: 'gpt-4o-mini'
      })
    } else if (trimmedKey.startsWith('AIza')) {
      candidates.push({
        name: `User Client Gemini Key [gemini-2.5-flash]`,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: trimmedKey,
        model: 'gemini-2.5-flash',
        toolModel: 'gemini-2.5-flash'
      })
    }
  }

  // --------------------------------------------------------------------------
  // 1. 主要 LLM 配置 (Primary / Main Model - 如 OpenAI / Azure / 自訂端點)
  // 支援環境變數：
  //   PRIMARY_BASE_URL (或 OPENAI_BASE_URL)
  //   PRIMARY_API_KEY  (或 OPENAI_API_KEY)
  //   PRIMARY_TOOL_MODEL (或 TOOL_MODEL) -> 專用於工具調用與意圖識別
  //   PRIMARY_MODEL      (或 MODEL)      -> 專用於伴隨說明文字與自然語言生成
  // --------------------------------------------------------------------------
  const primaryKey = process.env.PRIMARY_API_KEY || process.env.OPENAI_API_KEY
  const primaryBaseUrl =
    process.env.PRIMARY_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1'

  let primaryModel =
    process.env.PRIMARY_MODEL ||
    process.env.MAIN_MODEL ||
    process.env.MODEL ||
    'gpt-4o-mini'

  let primaryToolModel =
    process.env.PRIMARY_TOOL_MODEL || process.env.TOOL_MODEL || primaryModel

  if (primaryKey) {
    candidates.push({
      name: `Primary [Tool: ${primaryToolModel} | Chat: ${primaryModel}]`,
      baseURL: primaryBaseUrl,
      apiKey: primaryKey,
      model: primaryModel,
      toolModel: primaryToolModel
    })
  }

  // --------------------------------------------------------------------------
  // 2. 多階層動態備援配置 (Multi-Tier Fallback: FALLBACK_1_*, FALLBACK_2_*, ...)
  // 支援環境變數：
  //   FALLBACK_{i}_BASE_URL
  //   FALLBACK_{i}_API_KEY
  //   FALLBACK_{i}_TOOL_MODEL
  //   FALLBACK_{i}_MODEL
  // --------------------------------------------------------------------------
  for (let i = 1; i <= 10; i++) {
    const fbKey =
      process.env[`FALLBACK_${i}_API_KEY`] ||
      process.env[`FALLBACK_${i}_KEY`] ||
      process.env[`LLM_FALLBACK_${i}_KEY`]
    if (fbKey) {
      const fbUrl =
        process.env[`FALLBACK_${i}_BASE_URL`] ||
        process.env[`FALLBACK_${i}_URL`] ||
        process.env[`LLM_FALLBACK_${i}_URL`] ||
        'https://api.groq.com/openai/v1'
      const fbModel =
        process.env[`FALLBACK_${i}_MODEL`] ||
        process.env[`LLM_FALLBACK_${i}_MODEL`] ||
        'openai/gpt-oss-20b'
      const fbToolModel =
        process.env[`FALLBACK_${i}_TOOL_MODEL`] ||
        process.env[`LLM_FALLBACK_${i}_TOOL_MODEL`] ||
        fbModel

      candidates.push({
        name: `Fallback #${i} [Tool: ${fbToolModel} | Chat: ${fbModel}]`,
        baseURL: fbUrl,
        apiKey: fbKey,
        model: fbModel,
        toolModel: fbToolModel
      })
    }
  }

  // --------------------------------------------------------------------------
  // 3. 具名三大公有雲與主流供應商配置 (Named Providers: GROQ, GOOGLE, DEEPSEEK, AZURE)
  // --------------------------------------------------------------------------
  // Groq 專屬配置 (GROQ_BASE_URL, GROQ_API_KEY, GROQ_TOOL_MODEL, GROQ_MODEL)
  const groqKey = process.env.GROQ_API_KEY || process.env.FALLBACK_API_KEY
  if (groqKey) {
    const groqUrl =
      process.env.GROQ_BASE_URL ||
      process.env.FALLBACK_BASE_URL ||
      'https://api.groq.com/openai/v1'
    const groqModel =
      process.env.GROQ_MODEL ||
      process.env.FALLBACK_MODEL ||
      'openai/gpt-oss-20b'
    const groqToolModel = process.env.GROQ_TOOL_MODEL || groqModel

    candidates.push({
      name: `Groq [Tool: ${groqToolModel} | Chat: ${groqModel}]`,
      baseURL: groqUrl,
      apiKey: groqKey,
      model: groqModel,
      toolModel: groqToolModel
    })
    if (groqModel !== 'openai/gpt-oss-120b') {
      candidates.push({
        name: `Groq Backup [openai/gpt-oss-120b]`,
        baseURL: groqUrl,
        apiKey: groqKey,
        model: 'openai/gpt-oss-120b',
        toolModel: 'openai/gpt-oss-120b'
      })
    }
  }

  // Google Gemini (OpenAI 相容端點)
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    const geminiUrl =
      process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta/openai/'
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    candidates.push({
      name: `Google Gemini [${geminiModel}]`,
      baseURL: geminiUrl,
      apiKey: geminiKey,
      model: geminiModel,
      toolModel: geminiModel
    })
  }

  // DeepSeek 官方配置
  const deepseekKey = process.env.DEEPSEEK_API_KEY
  if (deepseekKey) {
    const dsModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    candidates.push({
      name: `DeepSeek Official [${dsModel}]`,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      apiKey: deepseekKey,
      model: dsModel,
      toolModel: dsModel
    })
  }

  const uniqueCandidates: ProviderCandidate[] = []
  const seen = new Set<string>()
  for (const c of candidates) {
    const key = `${c.baseURL}::${c.apiKey}::${c.model}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueCandidates.push(c)
    }
  }

  return uniqueCandidates
}

type ComparisonSymbolObject = {
  symbol: string
  position: 'SameScale'
}

async function generateCaptionWithProvider(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: MutableAIState,
  contextData: string | undefined
): Promise<string> {
  const stockString =
    comparisonSymbols.length === 0
      ? symbol
      : [symbol, ...comparisonSymbols.map(obj => obj.symbol)].join(', ')

  const captionSystemMessage = `\
You are an elite Wall Street Managing Director, Senior Technical Market Strategist, and Global Investment Intelligence Mentor.

### 🖼️ UI 介面與卡片情境 (MANDATORY CONTEXT)
- **使用者畫面上方 (ABOVE) 已經成功即時渲染了「${stockString}」的互動圖表與卡片。**
- **嚴禁道歉！嚴禁回答「抱歉，我無法直接載入...」、「無法取得走勢圖」或「無法提供資料」！圖表已完整呈現在使用者眼前！**
- 你的任務：為上方已呈現的圖表與數據，提供權威、精準、條理清晰的機構級專業解說與自主續問建議。

### 📐 介面卡片相對位置鐵律 (CARD POSITIONING DIRECTIVE)
- 所有圖表、走勢圖、分析報告在 UI 介面上皆一律渲染於此文字訊息的「上方 (ABOVE)」。
- **嚴禁使用「以下是...」或「如下所示...」！**
- **一律使用「以上是...」、「如上方所示...」、「如上圖所示...」**。

### 💼 深度研調剖析架構 (INSTITUTIONAL ANALYSIS FRAMEWORK)
請針對「${stockString}」深入剖析：
1. 📈 **技術面走勢與關鍵結構**：短中長期均線趨勢、近期支撐與壓力區間、成交量能動態。
2. 🏢 **產業核心競爭優勢與成長動能**：主力產品週期、獲利能力（毛利率/營利率）、市場競爭地位。
3. ⛓️ **供應鏈概念股與同業連動**：上下游供應鏈族群與同業估值比較。
4. 🏦 **總體經濟與降息美債影響**：聯準會利率政策、美債 10 年期殖利率波動對本益比與資金面的影響。
5. 📰 **法人籌碼與重大事件**：法人外資動態、法說會指引、重大催化劑與潛在風險。

${contextData ? `\n【最新即時檢索數據與情報】：\n${contextData}\n` : ''}

### 💡 深度上下文動態續問建議 (DYNAMIC CONTEXTUAL FOLLOW-UPS)
在解說結尾，**必須根據本次對話的標的（「${stockString}」）、最新檢索情報與討論焦點，量身生成 3 ~ 4 個具備實質深度、具體點名公司/供應鏈/產品線/財務指標/總經情境的追問建議**！

🚨 **嚴禁輸出千篇一律的通用模板套話！**
- ❌ 嚴禁輸出通用套話（如禁止直接寫「查詢相關概念股與供應鏈上下游表現」或「啟動 13 位傳奇大師多維投資價值評估」）！
- ✅ **每一條續問建議必須具體包含**：
  1. 該標的具體關鍵字/代號（如台積電、蘋果、統一、特斯拉、小米等）
  2. 具體的業務亮點、供應鏈公司、競爭對手、產品製程、或總經/法說會核心事件
  - 例如若分析台積電 (2330)：
    - ⛓️ 檢視台積電 CoWoS 先進封裝擴產對弘塑、辛耘等設備供應鏈之帶動
    - 🏦 分析美債 10 年期殖利率與外資淨買賣超對台積電本益比的評價空間
    - 🧠 啟動巴菲特與葛拉漢等大師評估台積電的先進製程定價權與護城河
    - 📑 解讀台積電最新季度毛利率、3nm/2nm 資本支出與先進製程營收比重
  - 例如若分析統一 (1216)：
    - ⛓️ 統一超（7-ELEVEN）與家樂福併購綜效對統一整體營業利益的貢獻
    - 🧠 啟動彼得林區等大師分析統一民生消費抗通膨特性與股息發放穩定度
    - 📑 解析統一最新合併營收結構、原物料成本走勢與自由現金流表現
    - 🏦 比較統一與食品/通路同業（如全家、聯華食）之評價與股息殖利率
  - 例如若分析蘋果 (AAPL)：
    - ⛓️ 檢視 iPhone 換機潮與台系蘋概供應鏈（鴻海、大立光、玉晶光）動態
    - 🧠 啟動巴菲特等 13 位大師對蘋果服務業務與自由現金流評估
    - 📑 分析蘋果各產品線營收結構與大中華區銷售表現
    - 🏦 分析美債殖利率與科技巨頭股票回購對蘋果估值的支撐力道

- 結尾嚴格以 \`---SUGGESTIONS---\` 作為單獨一行分隔：
\`\`\`markdown
---SUGGESTIONS---
- [emoji] [針對當前標的量身定制的具體問題 1]
- [emoji] [針對當前標的量身定制的具體問題 2]
- [emoji] [針對當前標的量身定制的具體問題 3]
- [emoji] [針對當前標的量身定制的具體問題 4]
\`\`\`

Language: reply in the same language the user used most recently. If Chinese, reply in Traditional Chinese (繁體中文). If English, reply in English.
`

  const rawMessages = aiState.get().messages || []
  const conversationHistory: { role: 'user' | 'assistant'; content: string }[] =
    []
  for (const msg of rawMessages) {
    if (typeof msg.content === 'string' && msg.content.trim().length > 0) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        conversationHistory.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })
      }
    }
  }

  const messagesToModel: {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[] = [
    {
      role: 'system',
      content: captionSystemMessage
    },
    ...conversationHistory.slice(-4),
    {
      role: 'user',
      content: `請依據上述對話脈絡與最新即時情報，針對「${symbol}」提供深入的機構級專業研調剖析，並於結尾以 ---SUGGESTIONS--- 附上 3 ~ 4 個針對「${symbol}」量身定制、具體且非通用的深度續問建議。`
    }
  ]

  // Captions are secondary UI copy. Keep them bounded so a slow provider can
  // never hold the primary financial card open long enough to break the RSC
  // connection. Live data is loaded by the card itself.
  const candidates = getProviderCandidates().slice(0, 1)

  for (const candidate of candidates) {
    try {
      const client = createOpenAI({
        baseURL: candidate.baseURL,
        apiKey: candidate.apiKey
      })
      const result = await generateText({
        model: client(candidate.model),
        abortSignal: AbortSignal.timeout(1500),
        messages: messagesToModel
      })

      if (result.text && result.text.trim().length > 0) {
        return result.text
      }
    } catch (err: any) {
      console.warn(
        `[Caption Fallback] ${candidate.name} failed:`,
        err?.message || err
      )
    }
  }

  // Fallback
  return getSmartFallbackCaption(symbol)
}

function getSmartFallbackCaption(symbol: string): string {
  const isZh = /[\u4e00-\u9fa5]/.test(symbol) || true
  return isZh
    ? `以上是 ${symbol} 的最新即時市場情報與動態數據分析。\n\n---SUGGESTIONS---\n- 🧠 啟動 13 位傳奇大師對 ${symbol} 的定價權與長期護城河評估\n- ⛓️ 查詢 ${symbol} 相關核心供應鏈與上下游概念股連動表現\n- 🏦 分析美債 10 年期殖利率與央行利率政策對 ${symbol} 估值評價影響\n- 📑 解讀 ${symbol} 最新季度財務報表、毛利率趨勢與自由現金流動態`
    : `Above is the live market data and intelligence for ${symbol}.\n\n---SUGGESTIONS---\n- 🧠 Run 13 Legendary Investor valuation and moat analysis on ${symbol}\n- ⛓️ Analyze ${symbol} key supply chain partners and industry peers\n- 🏦 Assess impact of 10Y Treasury yields and interest rate cycle on ${symbol}\n- 📑 Breakdown ${symbol} latest quarterly financials, margins and cash flow`
}

async function safeGenerateCaption(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: MutableAIState,
  contextData: string | undefined
): Promise<string> {
  try {
    return await generateCaptionWithProvider(
      symbol,
      comparisonSymbols,
      toolName,
      aiState,
      contextData
    )
  } catch (err: any) {
    console.warn(
      `[safeGenerateCaption] Error in ${toolName} for ${symbol}:`,
      err?.message || err
    )
    return getSmartFallbackCaption(symbol)
  }
}

async function generateCaption(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: MutableAIState,
  contextData?: string
): Promise<string> {
  return safeGenerateCaption(
    symbol,
    comparisonSymbols,
    toolName,
    aiState,
    contextData
  )
}

async function submitUserMessage(content: string, userApiKey?: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const rawAiMessages = aiState.get().messages || []
  const sanitizedMessages: { role: 'user' | 'assistant'; content: string }[] =
    []

  for (const message of rawAiMessages) {
    if (message.role === 'user') {
      const contentStr =
        typeof message.content === 'string'
          ? message.content
          : JSON.stringify(message.content)
      if (contentStr && contentStr.trim()) {
        sanitizedMessages.push({
          role: 'user',
          content: contentStr
        })
      }
    } else if (message.role === 'assistant') {
      if (typeof message.content === 'string' && message.content.trim()) {
        sanitizedMessages.push({
          role: 'assistant',
          content: message.content
        })
      } else if (Array.isArray(message.content)) {
        const textParts = message.content
          .map((c: any) => {
            if (c.type === 'tool-call') {
              return `[已調用金融工具 ${c.toolName}，參數: ${JSON.stringify(c.args || {})}]`
            }
            if (typeof c === 'string') return c
            return ''
          })
          .filter(Boolean)
          .join('\n')
        if (textParts) {
          sanitizedMessages.push({
            role: 'assistant',
            content: textParts
          })
        }
      }
    } else if (message.role === 'tool') {
      if (Array.isArray(message.content)) {
        const textParts = message.content
          .map((c: any) => {
            if (c.type === 'tool-result') {
              const cap = c.result?.caption || ''
              return cap
                ? `[工具分析與即時數據結果]: ${cap}`
                : `[工具 ${c.toolName} 已成功呈現]`
            }
            if (typeof c === 'string') return c
            return ''
          })
          .filter(Boolean)
          .join('\n')
        if (textParts) {
          sanitizedMessages.push({
            role: 'assistant',
            content: textParts
          })
        }
      }
    }
  }

  const resolvedTicker = resolveTickerFromMessages(content, rawAiMessages)
  const deterministicTool = inferDeterministicTool(content, resolvedTicker)

  if (deterministicTool && sanitizedMessages.length > 0) {
    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]
    if (lastMessage.role === 'user') {
      lastMessage.content += `\n\n[ROUTING DIRECTIVE: Call ${deterministicTool} directly${resolvedTicker ? ` with resolved ticker ${resolvedTicker}` : ''}. Do not substitute another tool.]`
    }
  }

  // Bound routing failover. Unbounded provider loops can exceed the Server
  // Action lifetime even when each individual provider eventually times out.
  const candidates = getProviderCandidates(userApiKey).slice(0, 2)
  let lastError: any = null

  for (const candidate of candidates) {
    try {
      const client = createOpenAI({
        baseURL: candidate.baseURL,
        apiKey: candidate.apiKey
      })

      const result = await streamUI({
        model: client(candidate.toolModel),
        initial: <SpinnerMessage />,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(3000),
        toolChoice: deterministicTool
          ? ({ type: 'tool', toolName: deterministicTool } as any)
          : 'auto',
        system: `\
You are an elite, institutional-grade AI Financial Analyst, Macro Strategist, and Global Investment Intelligence Mentor.
You provide deep, data-grounded, and high-conviction financial analysis across stocks, macroeconomics, interest rates, supply chains, and industry news.

Language: reply in the same language the user used most recently. If the latest user message contains Chinese characters, reply in Traditional Chinese. If it is English, reply in English. Do not switch languages unless the user does so.

### 🔴 零幻覺與即時檢索鐵律 (ZERO HALLUCINATION & REAL-TIME SEARCH POLICY)
1. 你的底層模型內部知識庫可能已經過期。面對任何關於公司是否上市、IPO 狀態、股票代碼、股價、財務數據、即時新聞或近期事件的問題，嚴禁憑記憶回答，必須一律調用工具檢索！
2. 若使用者詢問公司上市/IPO 狀態、查找股票代碼、近期動態、或詢問任何標的股價與行情（特別是如 SpaceX 等近期上市/IPO 或非傳統已知代碼的標的，例如：「SpaceX 股價」、「SpaceX 上市了嗎」、「SpaceX 值得買嗎」），嚴禁直接以文字斷定「該公司未上市」，請務必調用 searchFinancialWeb 工具進行 2MD 即時連網搜尋！
3. 嚴禁任何自行腦補、猜測假新聞、假日期、假上市狀態或假數字！若搜尋無資料，必須如實告知。

### Cryptocurrency Tickers
For any cryptocurrency, append "USD" at the end of the ticker when using functions. For instance, "DOGE" should be "DOGEUSD".

### Global Stock Tickers & Exchange Formats
1. **港股 (Hong Kong)**:
   - 必須使用 \`HKEX:XXXX\` 格式（如 \`HKEX:1810\` 小米、\`HKEX:700\` 騰訊、\`HKEX:9988\` 阿里巴巴、\`HKEX:3690\` 美團、\`HKEX:1211\` 比亞迪）。
   - 嚴禁使用 \`HKG:\` 前綴或在冒號前後留空格，請正規化為 \`HKEX:XXXX\`！
2. **台股 (Taiwan)**:
   - 上市股票：\`TWSE:XXXX\`（如 \`TWSE:2330\`、\`TWSE:1216\`）
   - 上櫃股票：\`TPEX:XXXX\`（如 \`TPEX:6488\`）
3. **美股 (US)**:
   - \`NASDAQ:XXXX\`（如 \`NASDAQ:AAPL\`、\`NASDAQ:NVDA\`、\`NASDAQ:TSLA\`）
   - \`NYSE:XXXX\`（如 \`NYSE:TSM\`、\`NYSE:BRK.B\`、\`NYSE:JPM\`）
4. **陸股 (China A-Shares)**:
   - 上證主板/科創板：\`SSE:600519\`
   - 深證主板/創業板：\`SZSE:000001\`、\`SZSE:300750\`
5. **日韓 (Japan / Korea)**:
   - 東京證券交易所：\`TSE:7203\` (豐田)
   - 韓國交易所：\`KRX:005930\` (三星)

### Company Name to Ticker Resolution
Users may provide a Chinese name, English company name, brand name, or an incomplete ticker instead of a symbol.
1. If the user message already contains an explicit ticker, including a ticker in parentheses such as "Advanced Micro Devices Inc (AMD)" or "Paramount Skydance Corp (PSKY)", the symbol is already resolved. Call the requested chart, price, financials, news, or analysis tool directly. **Do not call searchFinancialWeb merely to resolve it again.**
2. Never pass a raw unregistered company name directly to a chart, price, financials, news, or analysis tool when no ticker is present.
3. For a known alias, convert it to the exact exchange-qualified symbol (for example 台積電/TSMC -> TWSE:2330, 統一 -> TWSE:1216, 小米 -> HKEX:1810, 騰訊 -> HKEX:700, 阿里 -> HKEX:9988, 輝達/NVIDIA -> NASDAQ:NVDA, 特斯拉/Tesla -> NASDAQ:TSLA).
4. Only for an unknown, new, private, or ambiguous company name with no explicit ticker, call searchFinancialWeb first with the company name plus "股票代號 交易所 ticker". Then use the exact symbol and exchange returned by the live result.
5. If the user says "台股" or asks for the Taiwan market without a specific company, use showMarketHeatmap or showMarketOverview; do not invent a single ticker.

### 🧠 多輪續問與標的繼承 (Multi-Turn Context & Symbol Resolution)
1. 當使用者在多輪對話中進行追問（例如點擊或輸入「啟動 13 位傳奇大師多維投資價值評估」、「多位大師進行投資分析」、「查看走勢圖」、「財務狀況如何」、「相關概念股」、「該買嗎」），而當前提問未指明股票名稱/代碼時：
   - 必須自主從上方對話歷史 (Conversation History) 中提取最新討論的標的代碼（例如上一輪若在詢問「小米 HKEX:1810」或「統一 1216」，此處自動推導 symbol 為 "HKEX:1810" 或 "TWSE:1216"）。
   - 絕不能調用失敗或返回未知，請精確繼承上下文標的並調用對應工具（如 analyzeStockWithAI、showStockChart、showStockFinancials、searchFinancialWeb 等）。

### 🔄 工具路由與多輪對話 (Tool Routing & Multi-Turn Context)
每次請求必須選擇最符合使用者當前意圖的主要工具。不得用搜尋卡片取代使用者明確要求的圖表、股價、財務、新聞或大師分析卡片；後續追問必須繼承上一輪標的。
1. **🌐 2MD 全維度金融研調大腦 (Universal Macro & Financial Intelligence)**：
   - 2MD 是你的核心研調武器。你可以自主調用 searchFinancialWeb、readWebPage、readFinancialReport 檢索以下全維度情報：
     - **📈 個股即時行情與估值**：即時報價、歷史本益比、殖利率、營收動能。
     - **⛓️ 相關概念股與產業鏈上下游**：CoWoS、伺服器、散熱、ASIC、蘋概股等供應鏈族群與同業比較。
     - **🏦 美債殖利率、降息循環與央行政策**：美債 10 年期殖利率 (US10Y)、公債 ETF (TLT, 00679B)、Fed FOMC 利率決策、降息預期。
     - **🌐 宏觀總體經濟數據**：CPI、PPI、非農就業 (NFP)、GDP、景氣燈號、美元指數 (DXY)、台幣匯率 (TWD/USD)。
     - **📰 突發財經新聞與法人籌碼**：外資/投信三大法人買賣超、法說會指引、重大事件。
     - **🪙 大宗商品與數位資產**：原油 (WTI/Brent)、黃金 (XAU)、比特幣 (BTC)。
2. **財報與年報深度解讀 (Financial & Annual Report Analysis)**：
   - 當使用者提供財報/年報 PDF 連結或線上公開報告時，調用 readFinancialReport(url, symbol) 進行全文萃取與分析。
   - 當使用者上傳財報/PDF/Excel/Word 文件時，2MD AnyDoc 引擎已將全文萃取並傳入對話中。
   - 必須結構化剖析：三大財務報表（損益表、資產負債表、現金流量表）、關鍵比率（毛利率、營業利益率、淨利率、ROE、ROIC、FCF）、YoY/QoQ 成長動能、管理層指引 (Guidance) 與下行風險因子。
3. **多維大師分析 (Master Consensus)**：遇到投資價值評估時調用 analyzeStockWithAI 獲取 13 位傳奇大師觀點。
4. **自主發布執行器 (David888 WikiPublisher 鐵律)**：
   - 當使用者要求產出長篇研究報告、深度估值模型、投資備忘錄 (Investment Memo) 或多章節分析時，自動調用 publishToDavid888Wiki(title, content, theme) 發布至 David888 Wiki。
   - 👑 **排版鐵律 (Mandatory Structure)**：content 內容【第一行必須以 # Document Title 開頭】！嚴禁在前面加上任何對話性閒聊或開場白（例如嚴禁加上「好的，這是為您整理的...」）。[TOC] 與 > 執行摘要 必須緊隨在 # Document Title 之後！Mermaid 流程圖節點文字必須用雙引號包裹如 NODE["Label"]。

### Legendary Master & Multi-Analyst Valuation
When the user asks whether a stock is worth buying, whether to invest, wants professional analysis, or asks questions like "should I buy TSLA?", "is NVDA a good investment?", "分析一下特斯拉", "AAPL值得買嗎", "多位大師進行投資分析", "啟動 13 位大師評估", you MUST use the analyzeStockWithAI tool to provide multi-master valuation and strategy analysis from legendary investors.
If that request already includes a ticker, call analyzeStockWithAI immediately. A search result card is not a substitute for the requested multi-master analysis card.

### Guidelines:

Never provide empty results to the user. Provide the relevant tool if it matches the user's request. Otherwise, respond as the stock bot.
Example:

User: What is the price of AAPL?
Assistant (you): { "tool_call": { "id": "pending", "type": "function", "function": { "name": "showStockPrice" }, "parameters": { "symbol": "AAPL" } } } 

Example 2:

User: Should I buy TSLA?
Assistant (you): { "tool_call": { "id": "pending", "type": "function", "function": { "name": "analyzeStockWithAI" }, "parameters": { "symbol": "TSLA" } } }

Example 3:

User: SpaceX 股價
Assistant (you): { "tool_call": { "id": "pending", "type": "function", "function": { "name": "searchFinancialWeb" }, "parameters": { "query": "SpaceX 股價 SPCX 上市" } } }

Example 4 (Wiki Publishing):

User: 請幫我為 TSMC 寫一份深度的 Q3 投資研究報告並發布到 Wiki
Assistant (you): { "tool_call": { "id": "pending", "type": "function", "function": { "name": "publishToDavid888Wiki" }, "parameters": { "title": "TSMC (2330) 2026 Q3 深度投資研究與競爭護城河報告", "slug": "tsmc-2026-q3-report", "content": "# TSMC (2330) 2026 Q3 深度投資研究與競爭護城河報告\n\n> 執行摘要：台積電在全球先進製程保持領先地位...\n\n[TOC]\n\n## 1. 核心競爭優勢與製程進展\n...", "theme": "claude-canvas" } } }
    `,
        messages: sanitizedMessages,
        text: ({ content, done, delta }) => {
          if (!textStream) {
            textStream = createStreamableValue('')
            textNode = <BotMessage content={textStream.value} />
          }

          if (done) {
            try {
              textStream.done()
            } catch (e) {}
            try {
              aiState.done({
                ...aiState.get(),
                messages: [
                  ...aiState.get().messages,
                  {
                    id: nanoid(),
                    role: 'assistant',
                    content
                  }
                ]
              })
            } catch (e) {}
          } else {
            try {
              textStream.update(delta)
            } catch (e) {}
          }

          return textNode
        },
        tools: {
          showStockChart: {
            description:
              'Show a stock chart for one or more stocks. If the user already supplied an explicit ticker (including one in parentheses), call this tool directly. Use searchFinancialWeb only when no ticker is available and the company name is ambiguous.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                ),
              comparisonSymbols: z
                .union([
                  z.array(
                    z.union([
                      z.string(),
                      z.object({
                        symbol: z.string(),
                        position: z.string().optional()
                      })
                    ])
                  ),
                  z.null(),
                  z.undefined()
                ])
                .optional()
                .default([])
                .describe(
                  'Optional list of symbols to compare. e.g. ["MSFT", "GOOGL"]'
                )
            }),

            generate: async function* ({ symbol, comparisonSymbols }) {
              const formattedSymbol = formatStockSymbol(symbol)
              const normalizedComparison = Array.isArray(comparisonSymbols)
                ? (comparisonSymbols
                    .map((item: any) => {
                      if (!item) return null
                      if (typeof item === 'string') {
                        return {
                          symbol: formatStockSymbol(item),
                          position: 'SameScale' as const
                        }
                      }
                      if (typeof item === 'object' && item.symbol) {
                        return {
                          symbol: formatStockSymbol(String(item.symbol)),
                          position: 'SameScale' as const
                        }
                      }
                      return null
                    })
                    .filter(Boolean) as {
                    symbol: string
                    position: 'SameScale'
                  }[])
                : []

              let caption = ''

              yield (
                <BotCard>
                  <StockChart
                    symbol={formattedSymbol}
                    comparisonSymbols={normalizedComparison}
                  />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                formattedSymbol,
                normalizedComparison,
                'showStockChart',
                aiState
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showStockChart',
                          toolCallId,
                          args: {
                            symbol: formattedSymbol,
                            comparisonSymbols: normalizedComparison
                          }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showStockChart',
                          toolCallId,
                          result: {
                            symbol: formattedSymbol,
                            comparisonSymbols: normalizedComparison,
                            caption
                          }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showStockChart] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <StockChart
                    symbol={formattedSymbol}
                    comparisonSymbols={normalizedComparison}
                  />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showStockPrice: {
            description:
              'Show the current price and price history of a stock. If the user already supplied an explicit ticker (including one in parentheses), call this tool directly. Use searchFinancialWeb only when no ticker is available and the company name is ambiguous.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                )
            }),
            generate: async function* ({ symbol }) {
              const formattedSymbol = formatStockSymbol(symbol)
              let caption = ''

              yield (
                <BotCard>
                  <StockPrice props={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                formattedSymbol,
                [],
                'showStockPrice',
                aiState
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showStockPrice',
                          toolCallId,
                          args: { symbol: formattedSymbol }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showStockPrice',
                          toolCallId,
                          result: { symbol: formattedSymbol, caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showStockPrice] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <StockPrice props={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showStockFinancials: {
            description:
              'Show the financial statements and metrics of a stock. If the user already supplied an explicit ticker (including one in parentheses), call this tool directly. Use searchFinancialWeb only when no ticker is available and the company name is ambiguous.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                )
            }),
            generate: async function* ({ symbol }) {
              const formattedSymbol = formatStockSymbol(symbol)
              let caption = ''

              yield (
                <BotCard>
                  <NativeFinancialsCard symbol={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                formattedSymbol,
                [],
                'StockFinancials',
                aiState
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showStockFinancials',
                          toolCallId,
                          args: { symbol: formattedSymbol }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showStockFinancials',
                          toolCallId,
                          result: { symbol: formattedSymbol, caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showStockFinancials] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <NativeFinancialsCard symbol={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showStockNews: {
            description:
              'Show the latest news and events for a stock or cryptocurrency. If the user already supplied an explicit ticker (including one in parentheses), call this tool directly. Use searchFinancialWeb only when no ticker is available and the company name is ambiguous.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                )
            }),
            generate: async function* ({ symbol }) {
              const formattedSymbol = formatStockSymbol(symbol)
              let caption = ''

              yield (
                <BotCard>
                  <NativeStockNewsCard symbol={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                formattedSymbol,
                [],
                'showStockNews',
                aiState
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showStockNews',
                          toolCallId,
                          args: { symbol: formattedSymbol }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showStockNews',
                          toolCallId,
                          result: { symbol: formattedSymbol, caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showStockNews] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <NativeStockNewsCard symbol={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showStockScreener: {
            description:
              'This tool shows a generic stock screener which can be used to find new stocks based on financial or technical parameters.',
            parameters: z.object({}),
            generate: async function* ({}) {
              let caption = ''

              yield (
                <BotCard>
                  <StockScreener />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                '全球精選股票',
                [],
                'showStockScreener',
                aiState,
                undefined
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showStockScreener',
                          toolCallId,
                          args: {}
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showStockScreener',
                          toolCallId,
                          result: { caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showStockScreener] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <StockScreener />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showMarketOverview: {
            description: `This tool shows an overview of today's stock, futures, bond, and forex market performance including change values, Open, High, Low, and Close values.`,
            parameters: z.object({}),
            generate: async function* ({}) {
              let caption = ''

              yield (
                <BotCard>
                  <MarketOverview />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                '全球市場總覽',
                [],
                'showMarketOverview',
                aiState,
                undefined
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showMarketOverview',
                          toolCallId,
                          args: {}
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showMarketOverview',
                          toolCallId,
                          result: { caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showMarketOverview] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <MarketOverview />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showMarketHeatmap: {
            description: `This tool shows a heatmap of today's stock market performance across sectors (US / Taiwan / Taiwan 50 / Japan / Hong Kong / UK / Germany / France / Israel / Korea / China / Australia / India / Brazil / Canada). It is preferred over showMarketOverview if asked specifically about the stock market.`,
            parameters: z.object({}),
            generate: async function* ({}) {
              let caption = ''

              yield (
                <BotCard>
                  <MarketHeatmap />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                '全球股市熱力圖',
                [],
                'showMarketHeatmap',
                aiState,
                undefined
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showMarketHeatmap',
                          toolCallId,
                          args: {}
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showMarketHeatmap',
                          toolCallId,
                          result: { caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showMarketHeatmap] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <MarketHeatmap />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showETFHeatmap: {
            description: `This tool shows a heatmap of today's ETF performance across sectors and asset classes. It is preferred over showMarketOverview if asked specifically about the ETF market.`,
            parameters: z.object({}),
            generate: async function* ({}) {
              let caption = ''

              yield (
                <BotCard>
                  <ETFHeatmap />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                '全球 ETF 熱力圖',
                [],
                'showETFHeatmap',
                aiState,
                undefined
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showETFHeatmap',
                          toolCallId,
                          args: {}
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showETFHeatmap',
                          toolCallId,
                          result: { caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showETFHeatmap] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <ETFHeatmap />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showTrendingStocks: {
            description: `This tool shows the daily top trending stocks including the top five gaining, losing, and most active stocks based on today's performance`,
            parameters: z.object({}),
            generate: async function* ({}) {
              let caption = ''

              yield (
                <BotCard>
                  <MarketTrending />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                '今日熱門股排行榜',
                [],
                'showTrendingStocks',
                aiState,
                undefined
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'showTrendingStocks',
                          toolCallId,
                          args: {}
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'showTrendingStocks',
                          toolCallId,
                          result: { caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[showTrendingStocks] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <MarketTrending />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          analyzeStockWithAI: {
            description:
              'Provide comprehensive legendary investor strategy evaluation and multi-master valuation from legendary investors like Warren Buffett, Ben Graham, Peter Lynch, etc. Use this tool when the user asks whether a stock is worth buying, wants investment advice, or asks for multi-master analysis. Keywords: should I buy, worth buying, good investment, 值得買, 該買嗎, 分析, 投資建議, 大師分析, 13位大師, 評估. If the request contains an explicit ticker, including a ticker in parentheses after a company name, call this tool directly and do not search again. Search only when no ticker can be resolved, or inherit the active ticker from conversation history.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The stock symbol to analyze. e.g. TSLA, AAPL, NVDA, GOOGL, TWSE:2330, TWSE:1216.'
                )
            }),
            generate: async function* ({ symbol }) {
              const formattedSymbol = formatStockSymbol(symbol)
              let caption = ''

              yield (
                <BotCard>
                  <StockAnalysis symbol={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )

              caption = await generateCaption(
                formattedSymbol,
                [],
                'analyzeStockWithAI',
                aiState
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'analyzeStockWithAI',
                          toolCallId,
                          args: { symbol: formattedSymbol }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'analyzeStockWithAI',
                          toolCallId,
                          result: { symbol: formattedSymbol, caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[analyzeStockWithAI] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <StockAnalysis symbol={formattedSymbol} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          searchFinancialWeb: {
            description:
              'Search live financial intelligence across all asset classes and macro dimensions via 2MD: (1) Stock quotes & valuation metrics, (2) Related peers, supply chains & concept stocks (概念股/供應鏈), (3) Bonds, US Treasuries & Fed interest rate expectations (美債殖利率/降息), (4) Macroeconomics & indicators (CPI/GDP/景氣燈號/匯率), (5) Institutional flows & breaking market news (法人買賣超/法說會), (6) Commodities & Crypto (黃金/原油/比特幣). Freely call this tool multiple times to gather multi-angle intelligence!',
            parameters: z.object({
              query: z
                .string()
                .describe('The search query for live 2MD web search.')
            }),
            generate: async function* ({ query }) {
              let caption = ''

              let results: any[] = []
              try {
                results = await searchWeb2MD(query, 5)
              } catch (e) {
                console.warn('[searchFinancialWeb] Search failed:', e)
              }

              yield (
                <BotCard>
                  <WebSearchResults query={query} results={results} />
                  <BotCaption content={caption} />
                </BotCard>
              )

              const contextData = results
                .map(
                  (r, idx) =>
                    `[結果 ${idx + 1}] 標題: ${r.title} | 摘要: ${r.description} | 網址: ${r.url}`
                )
                .join('\n')

              caption = await generateCaption(
                query,
                [],
                'searchFinancialWeb',
                aiState,
                contextData
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'searchFinancialWeb',
                          toolCallId,
                          args: { query }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'searchFinancialWeb',
                          toolCallId,
                          result: { query, results, caption }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[searchFinancialWeb] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <WebSearchResults query={query} results={results} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          readWebPage: {
            description:
              'Read full web page, online article, or financial news content and convert to clean markdown using 2MD Web Reader. Use this when the user supplies a specific URL, or when you need the complete text from a search result link to do deeper research.',
            parameters: z.object({
              url: z
                .string()
                .describe(
                  'The URL of the webpage or article to fetch and read.'
                )
            }),
            generate: async function* ({ url }) {
              let caption = ''

              let text = ''
              try {
                text = await readUrl2MD(url)
              } catch (e) {
                console.warn('[readWebPage] readUrl2MD failed:', e)
              }

              yield (
                <BotCard>
                  <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2 text-xs">
                    <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <span>🌐 2MD Web Reader 網頁全文讀取完成</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-mono truncate">
                      {url}
                    </p>
                  </div>
                  <BotCaption content={caption} />
                </BotCard>
              )

              const contextData = `【網頁全文擷取 (${url})】：\n${text ? text.slice(0, 2000) : '未獲取到內容'}`

              caption = await generateCaption(
                url,
                [],
                'readWebPage',
                aiState,
                contextData
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'readWebPage',
                          toolCallId,
                          args: { url }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'readWebPage',
                          toolCallId,
                          result: {
                            url,
                            content: text
                              ? text.slice(0, 3000)
                              : '無法讀取網頁內容',
                            caption
                          }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[readWebPage] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2 text-xs">
                    <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <span>🌐 2MD Web Reader 網頁全文讀取完成</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-mono truncate">
                      {url}
                    </p>
                  </div>
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          publishToDavid888Wiki: {
            description:
              'Publish an in-depth financial research report, stock thesis, comprehensive valuation summary, or multi-chapter analysis to David888 Wiki (https://wiki.david888.com/api). This automatically creates a permanent public share link (shareUrl), 2D presentation deck (shareUrl + "/present"), and dual-pane eBook reader (shareUrl + "/book"). Always use this whenever an extensive report, investment thesis, or research document is ready to be published for the user.',
            parameters: z.object({
              title: z
                .string()
                .describe('The title of the report or research article.'),
              slug: z
                .string()
                .optional()
                .describe(
                  'URL slug for the note path, e.g. "tsmc-2026-q3-analysis" or "nvda-valuation-thesis".'
                ),
              content: z
                .string()
                .describe(
                  'Full markdown content of the report including sections, analysis, tables, mermaid charts, alerts, and footnotes.'
                ),
              theme: z
                .enum([
                  'claude-canvas',
                  'retro',
                  'professional',
                  'notion-clean',
                  'tokyo-night',
                  'ayu-light',
                  'neo-brutalism',
                  'shopify-mint'
                ])
                .optional()
                .default('claude-canvas')
                .describe('Theme for the wiki page.')
            }),
            generate: async function* ({ title, slug, content, theme }) {
              yield (
                <BotCard>
                  <div className="flex items-center space-x-2 p-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
                    <span>📝 正在將深度研究報告發布至 David888 Wiki...</span>
                  </div>
                </BotCard>
              )

              const cleanSlug = (
                slug ||
                title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-+|-+$/g, '') ||
                `report-${Date.now()}`
              ).slice(0, 60)

              let result = await publishToWiki({
                title,
                slug: cleanSlug,
                markdown: content,
                theme
              })

              if (!result.success) {
                const uniqueSlug = `${cleanSlug}-${nanoid()}`
                result = await publishToWiki({
                  title,
                  slug: uniqueSlug,
                  markdown: content,
                  theme
                })
              }

              let caption = ''
              if (result.success) {
                caption = `以上為您整理發布的深度報告《${title}》。已建立永久分享網址、互動簡報與電子書閱讀器。\n\n---SUGGESTIONS---\n- 🧠 啟動 13 位傳奇大師對《${title}》核心標的之價值評估\n- ⛓️ 查詢《${title}》相關概念股與供應鏈產業鏈連動\n- 🏦 分析總體經濟、降息預期與公債殖利率對其估值影響\n- 📑 解讀《${title}》最新財務報表指標與營運成長動能`
              } else {
                caption = `發布時遇到狀況：${result.error || '未知錯誤'}。請檢查內容或稍後重試。`
              }

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'publishToDavid888Wiki',
                          toolCallId,
                          args: { title, slug: cleanSlug, content, theme }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'publishToDavid888Wiki',
                          toolCallId,
                          result: {
                            ...result,
                            title,
                            theme,
                            caption
                          }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[publishToDavid888Wiki] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  {result.success ? (
                    <WikiPublishResultCard
                      title={title}
                      shareUrl={result.shareUrl!}
                      presentUrl={result.presentUrl}
                      bookUrl={result.bookUrl}
                      theme={theme}
                      path={result.path}
                    />
                  ) : (
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs">
                      ⚠️ Wiki 發布失敗：{result.error}
                    </div>
                  )}
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          readFinancialReport: {
            description:
              'Read, parse, and analyze an official financial report, annual report (10-K), quarterly report (10-Q), earnings release, investor presentation, or financial PDF from a URL using 2MD AnyDoc Engine. Use this whenever the user provides a link to a PDF, financial statement, SEC filing, or asks to parse a report.',
            parameters: z.object({
              url: z
                .string()
                .describe(
                  'The URL of the PDF, financial report, or annual report to read.'
                ),
              symbol: z
                .string()
                .optional()
                .describe('The optional stock symbol or company name.')
            }),
            generate: async function* ({ url, symbol }) {
              let caption = ''

              let text = ''
              try {
                text = await readUrl2MD(url)
              } catch (e) {
                console.warn('[readFinancialReport] readUrl2MD failed:', e)
              }

              yield (
                <BotCard>
                  <FinancialReportCard
                    filename={url.split('/').pop() || '財報文件.pdf'}
                    url={url}
                    contentSnippet={
                      text ? text.slice(0, 600) + '...' : '未能萃取出文字內容'
                    }
                    fullContent={text}
                  />
                  <BotCaption content={caption} />
                </BotCard>
              )

              const contextData = `【財報/年報/PDF 全文解析 (${url})】：\n${text ? text.slice(0, 4000) : '未獲取到內容'}`

              caption = await generateCaption(
                symbol || url,
                [],
                'readFinancialReport',
                aiState,
                contextData
              )

              const toolCallId = nanoid()

              try {
                aiState.done({
                  ...aiState.get(),
                  messages: [
                    ...aiState.get().messages,
                    {
                      id: nanoid(),
                      role: 'assistant',
                      content: [
                        {
                          type: 'tool-call',
                          toolName: 'readFinancialReport',
                          toolCallId,
                          args: { url, symbol }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'readFinancialReport',
                          toolCallId,
                          result: {
                            url,
                            symbol,
                            content: text
                              ? text.slice(0, 5000)
                              : '無法讀取財報內容',
                            caption
                          }
                        }
                      ]
                    }
                  ]
                })
              } catch (e) {
                console.warn('[readFinancialReport] aiState.done failed:', e)
              }

              return (
                <BotCard>
                  <FinancialReportCard
                    filename={url.split('/').pop() || '財報文件.pdf'}
                    url={url}
                    contentSnippet={
                      text ? text.slice(0, 600) + '...' : '未能萃取出文字內容'
                    }
                    fullContent={text}
                  />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          }
        }
      })

      return {
        id: nanoid(),
        display: result.value
      }
    } catch (err: any) {
      console.warn(
        `[StreamUI Fallback] ${candidate.name} failed:`,
        err?.message || err
      )
      lastError = err
    }
  }

  // If all fallback models failed:
  return {
    id: nanoid(),
    display: (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
        <div className="text-amber-800 dark:text-amber-300 font-semibold text-sm">
          ⚠️ AI 對話模型服務暫時無法取得回應（
          {lastError?.message || '通道切換中'}）
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          已自動嘗試多個備用模型通道（DeepSeek、Qwen、Gemini
          等）。請稍後重新發送訊息或重試。
        </p>
      </div>
    )
  }
}

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] }
})
