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
import { FinancialMetricCard } from '@/components/stocks/financial-metric-card'
import { NativeStockNewsCard } from '@/components/stocks/native-news-card'
import { WebSearchResults } from '@/components/stocks/web-search-results'
import { WikiPublishResultCard } from '@/components/stocks/wiki-publish-result'
import { FinancialReportCard } from '@/components/stocks/financial-report-card'
import { BotCaption } from '@/components/stocks/bot-caption'
import { readUrl2MD } from '@/lib/2md'
import { searchResearchEvidence } from '@/lib/research-search'
import { fetchFinancialFundamentals } from '@/lib/financial-fundamentals'
import {
  fetchEarningsIntelligence,
  type EarningsIntelligence
} from '@/lib/financial-fundamentals'
import { publishToWiki } from '@/lib/wiki'
import {
  fetchQuantMarketSnapshot,
  fetchPeerMultiples
} from '@/lib/quant/market-data'
import { calculateValuation } from '@/lib/quant/valuation'
import { analyzeSepa } from '@/lib/quant/sepa'
import {
  createStrategyLegs,
  generatePayoffCurve,
  summarizePayoff,
  type OptionStrategy
} from '@/lib/quant/black-scholes'
import {
  calculateAmihudIlliquidity,
  calculateEtfPremium,
  calculateFloatTurnover,
  calculateMarketImpact
} from '@/lib/quant/microstructure'
import { CompanyValuationCard } from '@/components/stocks/company-valuation-card'
import { SepaStrategyCard } from '@/components/stocks/sepa-strategy-card'
import { EarningsBriefingCard } from '@/components/stocks/earnings-briefing-card'
import { OptionsPayoffCard } from '@/components/stocks/options-payoff-card'
import { StockLiquidityCard } from '@/components/stocks/stock-liquidity-card'
import { EtfPremiumCard } from '@/components/stocks/etf-premium-card'
import { TransmissionChainCard } from '@/components/stocks/transmission-chain-card'
import {
  SignalTrackerCard,
  type SignalTrackerData
} from '@/components/stocks/signal-tracker-card'
import { MacroFactorRegimeCard } from '@/components/stocks/macro-factor-regime-card'
import { buildTransmissionAnalysis } from '@/lib/deepear'
import { fetchMacroFactorRegime } from '@/lib/quant/us-fddk'
import { toast } from 'sonner'
import {
  extractExplicitTicker,
  inferDeterministicTool,
  resolveTickerFromMessages
} from '@/lib/chat/routing'
import {
  SUGGESTIONS_MARKER,
  buildFollowupContext,
  contextDerivedFallback,
  normalizeFollowups,
  parseFollowupResponse,
  serializeFollowups
} from '@/lib/chat/followup-context'

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

  const researchTools = new Set([
    'searchFinancialWeb',
    'readWebPage',
    'readFinancialReport',
    'answerFinancialMetric'
  ])
  const isResearchSynthesis = researchTools.has(toolName)
  const latestUserQuestion = [...(aiState.get().messages || [])]
    .reverse()
    .find(
      message =>
        message.role === 'user' &&
        typeof message.content === 'string' &&
        message.content.trim()
    )?.content as string | undefined

  const researchSystemMessage = `\
You are the synthesis stage of a live financial research agent.

Live 2MD evidence is supplied below. The UI may show either source links or a source card ABOVE your answer. Your job is to answer the user's actual question from that evidence, not to describe the search operation.

Rules:
- Start with a direct answer. Never repeat the search query as if it were an answer.
- Never output generic filler such as "以上是 ... 的最新即時市場情報與動態數據分析".
- For a company-business question, explain what the company does, its core products/services, customers or distribution model, and how it makes money when the evidence supports those points.
- For one requested financial metric, state the value first, then its reporting period, currency, and whether it is reported, adjusted, or an estimate. Do not confuse EBITDA with operating income or net income. Cite the source title inline. If the exact metric cannot be verified from the supplied evidence, say so plainly and identify the closest verified figure without presenting it as EBITDA.
- For a broad financial-and-valuation request, synthesize only evidence-backed values for the latest reporting period. Prioritize revenue and growth, gross/operating/net margins, EPS, operating/free cash flow, leverage, and valuation multiples. Omit unavailable fields rather than inventing them.
- Distinguish verified facts from inference. If the provided evidence is insufficient, state the missing point precisely instead of inventing it.
- Refer to the evidence as "上方搜尋結果" or "上方資料" because the source card is above the answer.
- Answer in the same language as the user's latest question. Chinese must use Traditional Chinese.
- Keep the main answer focused and useful. Return the answer only; a separate follow-up pass handles next questions.
`

  const captionSystemMessage = isResearchSynthesis
    ? researchSystemMessage
    : `\
You are an elite Wall Street Managing Director, Senior Technical Market Strategist, and Global Investment Intelligence Mentor.

### 🖼️ UI 介面與卡片情境 (MANDATORY CONTEXT)
- **使用者畫面上方 (ABOVE) 已經成功即時渲染了「${stockString}」的互動圖表與卡片。**
- **嚴禁道歉！嚴禁回答「抱歉，我無法直接載入...」、「無法取得走勢圖」或「無法提供資料」！圖表已完整呈現在使用者眼前！**
- 你的任務：為上方已呈現的圖表與數據，提供權威、精準、條理清晰的機構級專業解說。

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

Language: reply in the same language the user used most recently. If Chinese, reply in Traditional Chinese (繁體中文). If English, reply in English. Return only the answer body. A separate server-side follow-up pass appends suggestions.
`

  const rawMessages = aiState.get().messages || []
  const followupContext = buildFollowupContext(rawMessages, {
    symbol: stockString,
    toolName,
    question: latestUserQuestion || symbol,
    resultContext: contextData
  })

  const messagesToModel: {
    role: 'system' | 'user' | 'assistant'
    content: string
  }[] = isResearchSynthesis
    ? [
        {
          role: 'system',
          content: captionSystemMessage
        },
        {
          role: 'user',
          content: `使用者原始問題：${latestUserQuestion || symbol}\n\n最近對話與工具紀錄：\n${followupContext.transcript || '無'}\n\n檢索查詢：${symbol}\n\n可用即時來源：\n${contextData || '沒有取得可用來源'}\n\n請只回答原始問題，不要輸出續問標記。`
        }
      ]
    : [
        {
          role: 'system',
          content: captionSystemMessage
        },
        {
          role: 'user',
          content: `最近對話與工具紀錄：\n${followupContext.transcript || '無'}`
        },
        {
          role: 'user',
          content: `請依據上述對話脈絡與最新即時情報，針對「${symbol}」提供深入且可核實的解說。只輸出回答正文，不要輸出續問標記。`
        }
      ]

  // Ordinary card captions remain a single-provider, 1.5-second best-effort
  // path. Evidence synthesis is a separate answer task and gets a bounded
  // second provider without nesting another RSC stream.
  const candidates = getProviderCandidates().slice(
    0,
    isResearchSynthesis ? 2 : 1
  )

  for (const candidate of candidates) {
    try {
      const client = createOpenAI({
        baseURL: candidate.baseURL,
        apiKey: candidate.apiKey
      })
      const result = await generateText({
        model: client(candidate.model),
        abortSignal: AbortSignal.timeout(isResearchSynthesis ? 7000 : 1500),
        maxTokens: isResearchSynthesis ? 700 : undefined,
        temperature: isResearchSynthesis ? 0.2 : undefined,
        messages: messagesToModel
      })

      if (result.text && result.text.trim().length > 0) {
        return result.text.trim()
      }
    } catch (err: any) {
      console.warn(
        `[Caption Fallback] ${candidate.name} failed:`,
        err?.message || err
      )
    }
  }

  if (isResearchSynthesis) {
    return getResearchFallbackCaption(
      latestUserQuestion || symbol,
      contextData,
      toolName
    )
  }

  return getSmartFallbackCaption(
    symbol,
    toolName,
    latestUserQuestion,
    contextData
  )
}

function getResearchFallbackCaption(
  question: string,
  contextData?: string,
  toolName?: string
): string {
  if (toolName === 'answerFinancialMetric') {
    return `目前無法從上方即時來源可靠核實「${question}」的精確數值與財報期間；為避免把其他科目誤當成答案，本次不提供推估值。`
  }
  const evidence = (contextData || '')
    .split('\n')
    .map(line => line.replace(/\s*\|\s*網址:.+$/i, '').trim())
    .filter(Boolean)
    .slice(0, 3)

  if (evidence.length === 0) {
    return `即時檢索目前沒有取得足以回答「${question}」的可靠資料，暫時無法據此下結論。`
  }

  return `根據上方即時檢索資料，目前可確認的重點是：\n\n${evidence.map(item => `- ${item}`).join('\n')}`
}

function getSmartFallbackCaption(
  symbol: string,
  toolName = 'card',
  question?: string,
  contextData?: string
): string {
  if (contextData) {
    return `根據上方資料，目前可確認的重點已整理在卡片中；未提供的數值不做推估。`
  }
  return `如上方卡片所示，${symbol} 的資料已呈現；目前先回答${question ? `「${question}」` : '本次問題'}。`
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
    const researchTools = new Set([
      'searchFinancialWeb',
      'readWebPage',
      'readFinancialReport',
      'answerFinancialMetric'
    ])
    if (researchTools.has(toolName)) {
      const latestUserQuestion = [...(aiState.get().messages || [])]
        .reverse()
        .find(
          message =>
            message.role === 'user' &&
            typeof message.content === 'string' &&
            message.content.trim()
        )?.content as string | undefined
      return getResearchFallbackCaption(
        latestUserQuestion || symbol,
        contextData,
        toolName
      )
    }
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
  const answer = await safeGenerateCaption(
    symbol,
    comparisonSymbols,
    toolName,
    aiState,
    contextData
  )
  return appendContextualFollowups(
    answer,
    {
      symbol,
      toolName,
      question: getLatestUserQuestion(aiState) || symbol,
      resultContext: contextData
    },
    aiState
  )
}

function getLatestUserQuestion(aiState: MutableAIState): string {
  return (
    ([...(aiState.get().messages || [])]
      .reverse()
      .find(
        message =>
          message.role === 'user' &&
          typeof message.content === 'string' &&
          message.content.trim()
      )?.content as string | undefined) || ''
  )
}

async function generateContextualFollowups(
  aiState: MutableAIState,
  input: {
    symbol: string
    toolName: string
    question: string
    resultContext?: string
    company?: string
  }
): Promise<string[]> {
  const context = buildFollowupContext(aiState.get().messages || [], input)
  let partialSuggestions: string[] = []
  const instruction = `
You generate only actionable follow-up questions for a live financial research chat.
Return ONLY a JSON array of 2 to 4 strings. No markdown, explanation, invitation, or code fence.
Each string must be a complete question in ${context.language === 'zh-TW' ? 'Traditional Chinese' : 'English'}.
Continue the user's current topic. Use the actual symbol/company from context. Ask about a concrete next fact, comparison, period, metric, event, or missing evidence.
Do not repeat the current question, recent questions, or previous suggestions. Do not invent a company, ticker, price, date, or financial value.

Current symbol/company: ${context.company || context.symbol}
Tool intent: ${context.toolName}
Current question: ${context.question}
Current result/evidence: ${context.resultContext || 'none'}
Recent conversation and tool records:
${context.transcript || 'none'}
`

  for (const candidate of getProviderCandidates().slice(0, 1)) {
    try {
      const client = createOpenAI({
        baseURL: candidate.baseURL,
        apiKey: candidate.apiKey
      })
      const result = await generateText({
        model: client(candidate.model),
        abortSignal: AbortSignal.timeout(2500),
        maxTokens: 260,
        temperature: 0.35,
        messages: [{ role: 'system', content: instruction }]
      })
      const suggestions = normalizeFollowups(
        parseFollowupResponse(result.text),
        context
      )
      if (suggestions.length >= 2) return suggestions
      partialSuggestions = suggestions
    } catch (error: any) {
      console.warn('[Followup] provider failed:', error?.message || error)
    }
  }
  return normalizeFollowups(
    [...partialSuggestions, ...contextDerivedFallback(context)],
    context
  )
}

async function appendContextualFollowups(
  answer: string,
  input: {
    symbol: string
    toolName: string
    question: string
    resultContext?: string
    company?: string
  },
  aiState: MutableAIState
): Promise<string> {
  const suggestions = await generateContextualFollowups(aiState, input)
  return serializeFollowups(answer, suggestions)
}

function latestFactValue(
  facts:
    | Array<{ key: string; frequency: string; date: string; value: number }>
    | undefined,
  key: string,
  frequency?: string
): number | undefined {
  return facts
    ?.filter(
      fact => fact.key === key && (!frequency || fact.frequency === frequency)
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)?.value
}

function emptyEarnings(symbol: string): EarningsIntelligence {
  return {
    symbol,
    session: 'unknown',
    eps: {},
    revenue: {},
    history: [],
    priceTarget: {},
    source: {
      title: 'Yahoo Finance Earnings',
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/analysis/`,
      description: '目前沒有取得可核實的 earnings 資料。',
      publisher: 'Yahoo Finance'
    }
  }
}

function saveQuantToolResult(
  aiState: MutableAIState,
  toolName: string,
  args: Record<string, any>,
  result: Record<string, any>,
  caption: string
) {
  const toolCallId = nanoid()
  try {
    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: [{ type: 'tool-call', toolName, toolCallId, args }]
        },
        {
          id: nanoid(),
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolName,
              toolCallId,
              result: { ...result, caption }
            }
          ]
        }
      ]
    })
  } catch (error) {
    console.warn(`[${toolName}] aiState.done failed:`, error)
  }
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
  const currentExplicitTicker = extractExplicitTicker(content)
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
6. If an explicit ticker is present and the user asks for a financial summary, valuation, any financial-statement line item, ratio, growth comparison, valuation multiple, or accounting term (including unfamiliar ones), call answerFinancialMetric. Do not expose a raw search-results card for a financial question.

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
When you answer directly without calling a tool, end the answer with a standalone ${SUGGESTIONS_MARKER} marker followed by 2 to 4 concise, actionable follow-up questions. Derive them from the latest user question and recent conversation. Reuse the active company or ticker when one exists. Do not use generic invitations, do not repeat a previous question, and do not invent facts or values.
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
        text: ({ content: responseContent, done, delta }) => {
          if (!textStream) {
            textStream = createStreamableValue('')
            textNode = <BotMessage content={textStream.value} />
          }

          if (done) {
            const directContext = buildFollowupContext(
              aiState.get().messages || [],
              {
                symbol: resolvedTicker || currentExplicitTicker || '目前主題',
                toolName: 'directResponse',
                question: content,
                resultContext: responseContent
              }
            )
            const hasSuggestions = responseContent.includes(SUGGESTIONS_MARKER)
            const fallbackSuggestions = hasSuggestions
              ? []
              : contextDerivedFallback(directContext)
            const finalContent = hasSuggestions
              ? responseContent
              : serializeFollowups(responseContent, fallbackSuggestions)
            const suffix = fallbackSuggestions.length
              ? `\n\n${SUGGESTIONS_MARKER}\n${fallbackSuggestions
                  .map(item => `- ${item}`)
                  .join('\n')}`
              : ''
            try {
              if (suffix) textStream.update(suffix)
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
                    content: finalContent
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
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
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
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
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
          answerFinancialMetric: {
            description:
              'Answer a financial summary or requested metric such as revenue, margins, EBITDA, EBIT, EPS, FCF, ROE, ROIC, growth, valuation multiples, leverage ratios, or dividend yield. Search live evidence privately and return a concise synthesized answer instead of a raw search-results list.',
            parameters: z.object({
              symbol: z
                .string()
                .describe('The explicit stock ticker supplied by the user.')
            }),
            generate: async function* ({ symbol }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              const question = content.trim()
              let caption = ''

              yield (
                <BotCard>
                  <FinancialMetricCard
                    symbol={formattedSymbol}
                    question={question}
                    loading
                  />
                  <BotCaption content={caption} />
                </BotCard>
              )

              let results: any[] = []
              let structuredEvidence = ''
              let directAnswer = ''
              try {
                const fundamentals = await fetchFinancialFundamentals(
                  formattedSymbol,
                  question
                )
                if (fundamentals) {
                  structuredEvidence = fundamentals.evidence
                  directAnswer = fundamentals.directAnswer || ''
                  results.push(fundamentals.source)
                }
              } catch (error) {
                console.warn(
                  '[answerFinancialMetric] Fundamentals failed:',
                  error
                )
              }

              if (!directAnswer) {
                try {
                  const evidence = await searchResearchEvidence({
                    question,
                    symbol: formattedSymbol,
                    mode: 'financial',
                    limit: 6
                  })
                  const existingUrls = new Set(
                    results.map(result => String(result.url || ''))
                  )
                  results.push(
                    ...evidence.results.filter(
                      result => !existingUrls.has(String(result.url || ''))
                    )
                  )
                } catch (error) {
                  console.warn('[answerFinancialMetric] Search failed:', error)
                }
              }

              const searchEvidence = results
                .map(
                  (result, index) =>
                    `[來源 ${index + 1}] 標題: ${result.title} | 摘要: ${result.description} | 網址: ${result.url}`
                )
                .join('\n')

              const contextData = [structuredEvidence, searchEvidence]
                .filter(Boolean)
                .join('\n\n')

              caption = directAnswer
                ? await appendContextualFollowups(
                    directAnswer,
                    {
                      symbol: formattedSymbol,
                      toolName: 'answerFinancialMetric',
                      question,
                      resultContext: contextData
                    },
                    aiState
                  )
                : await generateCaption(
                    formattedSymbol,
                    [],
                    'answerFinancialMetric',
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
                          toolName: 'answerFinancialMetric',
                          toolCallId,
                          args: { symbol: formattedSymbol, question }
                        }
                      ]
                    },
                    {
                      id: nanoid(),
                      role: 'tool',
                      content: [
                        {
                          type: 'tool-result',
                          toolName: 'answerFinancialMetric',
                          toolCallId,
                          result: {
                            symbol: formattedSymbol,
                            question,
                            caption,
                            sources: results.slice(0, 3)
                          }
                        }
                      ]
                    }
                  ]
                })
              } catch (error) {
                console.warn(
                  '[answerFinancialMetric] aiState.done failed:',
                  error
                )
              }

              return (
                <BotCard>
                  <FinancialMetricCard
                    symbol={formattedSymbol}
                    question={question}
                    sources={results}
                  />
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
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
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
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
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
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
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
          calculateCompanyValuation: {
            description:
              'Calculate a company valuation using DCF, CAPM/WACC, peer multiples, and a 5 by 5 sensitivity matrix.',
            parameters: z.object({
              symbol: z.string().describe('The explicit stock ticker.')
            }),
            generate: async function* ({ symbol }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在載入 {formattedSymbol} 財務資料並計算 DCF…
                  </div>
                </BotCard>
              )
              let snapshot
              let peerMultiples: Array<{
                name: string
                pe?: number
                evToEbitda?: number
                evToSales?: number
              }> = []
              try {
                const [snap, peers] = await Promise.all([
                  fetchQuantMarketSnapshot(formattedSymbol),
                  fetchPeerMultiples(formattedSymbol).catch(() => [])
                ])
                snapshot = snap
                peerMultiples = peers
              } catch (error) {
                console.warn('[calculateCompanyValuation] data failed:', error)
              }
              const facts = snapshot?.fundamentals?.facts
              const price = snapshot?.price
              const data = calculateValuation({
                price: price || 0,
                sharesOutstanding: snapshot?.sharesOutstanding || 0,
                revenue:
                  snapshot?.revenue ||
                  latestFactValue(facts, 'TotalRevenue') ||
                  0,
                ebitda: snapshot?.ebitda,
                eps: snapshot?.eps,
                freeCashFlow: snapshot?.freeCashFlow || 0,
                cash: snapshot?.cash,
                debt: snapshot?.debt,
                beta: snapshot?.beta,
                revenueGrowth: snapshot?.revenueGrowth,
                peerMultiples
              })
              const context = JSON.stringify({
                price,
                wacc: data.capm.wacc,
                dcf: data.dcf?.sharePrice,
                fairValue: data.blendedFairValue,
                upside: data.impliedUpsideDownside
              })
              const caption = await generateCaption(
                formattedSymbol,
                [],
                'calculateCompanyValuation',
                aiState,
                context
              )
              saveQuantToolResult(
                aiState,
                'calculateCompanyValuation',
                { symbol: formattedSymbol },
                { symbol: formattedSymbol, price, data },
                caption
              )
              return (
                <BotCard>
                  <CompanyValuationCard
                    symbol={formattedSymbol}
                    price={price}
                    data={data}
                  />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          analyzeSepaStrategy: {
            description:
              'Evaluate Minervini SEPA Trend Template, four stages, VCP, and risk-based position sizing for a ticker.',
            parameters: z.object({
              symbol: z.string().describe('The explicit stock ticker.'),
              accountEquity: z.number().optional(),
              riskPercent: z.number().optional(),
              stopPercent: z.number().optional()
            }),
            generate: async function* ({
              symbol,
              accountEquity,
              riskPercent,
              stopPercent
            }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在載入 {formattedSymbol} 歷史 OHLCV 並檢查 SEPA…
                  </div>
                </BotCard>
              )
              let snapshot
              try {
                snapshot = await fetchQuantMarketSnapshot(formattedSymbol)
              } catch (error) {
                console.warn('[analyzeSepaStrategy] data failed:', error)
              }
              const data = analyzeSepa(snapshot?.prices || [], {
                accountEquity,
                riskPercent,
                stopPercent
              })
              const caption = await generateCaption(
                formattedSymbol,
                [],
                'analyzeSepaStrategy',
                aiState,
                JSON.stringify({
                  score: data.score,
                  stage: data.stage,
                  rsRating: data.rsRating,
                  vcp: data.vcp.detected
                })
              )
              saveQuantToolResult(
                aiState,
                'analyzeSepaStrategy',
                { symbol: formattedSymbol },
                { symbol: formattedSymbol, data },
                caption
              )
              return (
                <BotCard>
                  <SepaStrategyCard symbol={formattedSymbol} data={data} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          previewEarnings: {
            description:
              'Show upcoming earnings date, EPS and revenue consensus ranges, analyst price targets, and the last four EPS surprises.',
            parameters: z.object({
              symbol: z.string().describe('The explicit stock ticker.')
            }),
            generate: async function* ({ symbol }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在載入 {formattedSymbol} earnings 共識資料…
                  </div>
                </BotCard>
              )
              let data
              try {
                data = await fetchEarningsIntelligence(formattedSymbol)
              } catch (error) {
                console.warn('[previewEarnings] data failed:', error)
              }
              const earnings = data || emptyEarnings(formattedSymbol)
              const caption = await generateCaption(
                formattedSymbol,
                [],
                'previewEarnings',
                aiState,
                JSON.stringify({
                  earningsDate: earnings.earningsDate,
                  eps: earnings.eps,
                  revenue: earnings.revenue,
                  history: earnings.history
                })
              )
              saveQuantToolResult(
                aiState,
                'previewEarnings',
                { symbol: formattedSymbol },
                { symbol: formattedSymbol, data: earnings },
                caption
              )
              return (
                <BotCard>
                  <EarningsBriefingCard data={earnings} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          simulateOptionsPayoff: {
            description:
              'Simulate an interactive multi-leg options payoff curve with Black-Scholes theoretical pricing and Greeks.',
            parameters: z.object({
              symbol: z.string().describe('The explicit underlying ticker.'),
              strategy: z
                .enum([
                  'straddle',
                  'vertical-call',
                  'vertical-put',
                  'butterfly',
                  'iron-condor',
                  'covered-call'
                ])
                .optional()
                .default('straddle'),
              spot: z.number().optional(),
              strike: z.number().optional(),
              dte: z.number().optional().default(30),
              iv: z.number().optional().default(0.3),
              width: z.number().optional(),
              premium: z.number().optional().default(0)
            }),
            generate: async function* ({
              symbol,
              strategy,
              spot: requestedSpot,
              strike: requestedStrike,
              dte,
              iv,
              width,
              premium
            }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在建立 {formattedSymbol} 選擇權損益模擬器…
                  </div>
                </BotCard>
              )
              let snapshot
              if (
                requestedSpot === undefined ||
                requestedStrike === undefined
              ) {
                try {
                  snapshot = await fetchQuantMarketSnapshot(formattedSymbol)
                } catch (error) {
                  console.warn('[simulateOptionsPayoff] quote failed:', error)
                }
              }
              const spot = requestedSpot || snapshot?.price || 100
              const strike = requestedStrike || spot
              const safeDte = Math.max(1, Math.min(730, dte || 30))
              const safeIv = Math.max(0.01, Math.min(2, iv || 0.3))
              const legs = createStrategyLegs(
                (strategy || 'straddle') as OptionStrategy,
                strike,
                width,
                premium || 0
              )
              const curve = generatePayoffCurve(legs, spot, safeDte, safeIv)
              const summary = summarizePayoff(curve)
              const data = {
                strategy: (strategy || 'straddle') as OptionStrategy,
                legs,
                spot,
                strike,
                dte: safeDte,
                iv: safeIv,
                summary
              }
              const caption = await generateCaption(
                formattedSymbol,
                [],
                'simulateOptionsPayoff',
                aiState,
                JSON.stringify({
                  strategy,
                  maxProfit: summary.maxProfit,
                  maxLoss: summary.maxLoss,
                  breakevens: summary.breakevens
                })
              )
              saveQuantToolResult(
                aiState,
                'simulateOptionsPayoff',
                {
                  symbol: formattedSymbol,
                  strategy,
                  spot,
                  strike,
                  dte: safeDte,
                  iv: safeIv
                },
                { symbol: formattedSymbol, data },
                caption
              )
              return (
                <BotCard>
                  <OptionsPayoffCard symbol={formattedSymbol} data={data} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          analyzeEtfPremium: {
            description:
              'Analyze an ETF market price versus NAV, peer median divergence, bid-ask context, and dealer gamma exposure.',
            parameters: z.object({
              symbol: z.string().describe('The explicit ETF ticker.'),
              nav: z.number().optional(),
              gex: z.number().optional(),
              peerMedianDivergence: z.number().optional()
            }),
            generate: async function* ({
              symbol,
              nav: requestedNav,
              gex,
              peerMedianDivergence
            }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在載入 {formattedSymbol} ETF NAV 與市場資料…
                  </div>
                </BotCard>
              )
              let snapshot
              try {
                snapshot = await fetchQuantMarketSnapshot(formattedSymbol)
              } catch (error) {
                console.warn('[analyzeEtfPremium] data failed:', error)
              }
              const price = snapshot?.price || 0
              const nav = requestedNav || snapshot?.nav || 0
              const data = {
                symbol: formattedSymbol,
                ...calculateEtfPremium(price, nav, {
                  gex,
                  peerMedianDivergence,
                  bidAskSpreadBps: snapshot?.bidAskSpreadBps
                })
              }
              const caption = await generateCaption(
                formattedSymbol,
                [],
                'analyzeEtfPremium',
                aiState,
                JSON.stringify({
                  price,
                  nav,
                  divergence: data.divergencePercent,
                  gamma: data.gammaCondition
                })
              )
              saveQuantToolResult(
                aiState,
                'analyzeEtfPremium',
                { symbol: formattedSymbol },
                { symbol: formattedSymbol, data },
                caption
              )
              return (
                <BotCard>
                  <EtfPremiumCard data={data} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          analyzeStockLiquidity: {
            description:
              'Compute Amihud illiquidity, float turnover, and square-root market impact for a custom order size.',
            parameters: z.object({
              symbol: z.string().describe('The explicit stock ticker.'),
              orderSize: z.number().optional().default(50000)
            }),
            generate: async function* ({ symbol, orderSize }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在載入 {formattedSymbol} 成交量與流動性資料…
                  </div>
                </BotCard>
              )
              let snapshot
              try {
                snapshot = await fetchQuantMarketSnapshot(formattedSymbol)
              } catch (error) {
                console.warn('[analyzeStockLiquidity] data failed:', error)
              }
              const prices = snapshot?.prices || []
              const returns = prices
                .slice(1)
                .map((point, index) =>
                  prices[index].close > 0
                    ? point.close / prices[index].close - 1
                    : 0
                )
                .filter(Number.isFinite)
              const volatility = returns.length
                ? Math.sqrt(
                    returns.reduce((sum, value) => sum + value * value, 0) /
                      returns.length
                  ) * Math.sqrt(252)
                : 0
              const volumes = prices
                .map(point => point.volume)
                .filter(value => value > 0)
              const averageVolume = volumes.length
                ? volumes.reduce((sum, value) => sum + value, 0) /
                  volumes.length
                : 0
              const impact = calculateMarketImpact(
                volatility,
                orderSize || 50000,
                averageVolume,
                snapshot?.price
              )
              const curve = [0.25, 0.5, 1, 2, 4].map(multiplier => {
                const size = (orderSize || 50000) * multiplier
                return {
                  orderSize: size,
                  impactBps: calculateMarketImpact(
                    volatility,
                    size,
                    averageVolume
                  ).impactBps
                }
              })
              const data = {
                price: snapshot?.price,
                averageVolume,
                floatShares: snapshot?.floatShares,
                amihud: calculateAmihudIlliquidity(prices),
                floatTurnover: calculateFloatTurnover(
                  volumes,
                  snapshot?.floatShares || 0
                ),
                impact,
                orderSize: orderSize || 50000,
                curve
              }
              const caption = await generateCaption(
                formattedSymbol,
                [],
                'analyzeStockLiquidity',
                aiState,
                JSON.stringify({
                  amihud: data.amihud,
                  floatTurnover: data.floatTurnover,
                  impactBps: impact.impactBps
                })
              )
              saveQuantToolResult(
                aiState,
                'analyzeStockLiquidity',
                { symbol: formattedSymbol, orderSize: data.orderSize },
                { symbol: formattedSymbol, data },
                caption
              )
              return (
                <BotCard>
                  <StockLiquidityCard symbol={formattedSymbol} data={data} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showTransmissionChain: {
            description:
              'Analyze multi-tier financial transmission chains (Event -> 1st Order Impact -> 2nd Order Impact -> 3rd Order Stock Impact) using DeepEar Lite intelligence and quantitative causal mapping. Use this whenever the user asks about macro events, supply chain shocks, transmission chains, or sector ripple effects.',
            parameters: z.object({
              topic: z
                .string()
                .describe(
                  'The topic, macro event, or stock to trace transmission chain for.'
                ),
              symbol: z
                .string()
                .optional()
                .describe('Optional relevant stock ticker.')
            }),
            generate: async function* ({ topic, symbol }) {
              const targetSymbol = formatStockSymbol(
                resolvedTicker || symbol || ''
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在透過 DeepEar Lite 引擎構建「{topic}」金融邏輯傳導鏈…
                  </div>
                </BotCard>
              )

              const data = await buildTransmissionAnalysis(
                topic,
                targetSymbol || undefined
              )
              const context = JSON.stringify({
                topic: data.topic,
                status: data.signalStatus,
                sentiment: data.sentimentScore,
                steps: data.chain.map(
                  c => `${c.step}.${c.node}: ${c.impactLabel} (${c.logic})`
                ),
                falsification: data.falsificationCriteria
              })

              const caption = await generateCaption(
                targetSymbol || topic,
                [],
                'showTransmissionChain',
                aiState,
                context
              )

              saveQuantToolResult(
                aiState,
                'showTransmissionChain',
                { topic, symbol: targetSymbol },
                { topic, symbol: targetSymbol, data },
                caption
              )

              return (
                <BotCard>
                  <TransmissionChainCard data={data} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          trackInvestmentSignal: {
            description:
              'Track and evaluate investment signal evolution across 4 states (Strengthened, Weakened, Falsified, Unchanged) and explicit falsification triggers. Use this when the user asks whether an investment thesis or signal is invalidated/falsified, strengthened, or needs validation.',
            parameters: z.object({
              symbol: z.string().describe('The stock ticker to evaluate.'),
              hypothesis: z
                .string()
                .optional()
                .describe(
                  'Optional specific investment hypothesis or bull/bear thesis.'
                )
            }),
            generate: async function* ({ symbol, hypothesis }) {
              const formattedSymbol = formatStockSymbol(
                resolvedTicker || symbol
              )
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在追蹤與驗證 {formattedSymbol} 投資訊號演化與證偽條件…
                  </div>
                </BotCard>
              )

              const transmission = await buildTransmissionAnalysis(
                hypothesis || formattedSymbol,
                formattedSymbol
              )
              const trackerData: SignalTrackerData = {
                symbol: formattedSymbol,
                hypothesis:
                  hypothesis ||
                  `${formattedSymbol} 核心營運成長與產業龍頭溢價假說`,
                status: transmission.signalStatus,
                statusLabel: transmission.statusLabel,
                evidence: [
                  `最新宏觀與產業傳導狀態評估為「${transmission.chain[0]?.node || '總經流動性穩定'}」，一階傳導影響為 ${transmission.chain[0]?.impactLabel || '中性'}。`,
                  `產業鏈環節：${transmission.chain[1]?.logic || '供需格局平穩，龍頭企業維持定價主導權。'}`,
                  `企業現金流與獲利節奏：${transmission.chain[2]?.logic || '自由現金流與成長動能符合原先推演。'}`
                ],
                falsificationTriggers: transmission.falsificationCriteria,
                suggestedAction:
                  transmission.signalStatus === 'Falsified'
                    ? '立即停損出場，原投資論點已被實質證偽'
                    : transmission.signalStatus === 'Strengthened'
                    ? '可順應動能加碼或持有，基本面超預期強化'
                    : transmission.signalStatus === 'Weakened'
                    ? '提高警戒，適度獲利了結或收緊移動停利'
                    : '維持部位觀察，持續監控關鍵財務與技術指標',
                sentimentScore: transmission.sentimentScore,
                confidence: transmission.confidence
              }

              const context = JSON.stringify(trackerData)

              const caption = await generateCaption(
                formattedSymbol,
                [],
                'trackInvestmentSignal',
                aiState,
                context
              )

              saveQuantToolResult(
                aiState,
                'trackInvestmentSignal',
                { symbol: formattedSymbol, hypothesis },
                { symbol: formattedSymbol, data: trackerData },
                caption
              )

              return (
                <BotCard>
                  <SignalTrackerCard data={trackerData} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          showMacroFactorRegime: {
            description:
              'Analyze 20-year US factor regimes, multi-factor exposures (Momentum, Growth, Value, Volatility), and institutional ETF asset allocation baselines (SPY, QQQ, 80/20 VUG/SHY, 60/40) using audited US FDDK quantitative benchmarks.',
            parameters: z.object({
              query: z
                .string()
                .optional()
                .describe(
                  'Optional query context such as factor preference or asset allocation.'
                )
            }),
            generate: async function* ({ query }) {
              yield (
                <BotCard>
                  <div className="rounded-xl border p-4 text-xs text-muted-foreground">
                    正在載入 US FDDK 20 年多因子基準與跨資產 ETF 配置實證…
                  </div>
                </BotCard>
              )

              const data = await fetchMacroFactorRegime()
              const context = JSON.stringify({
                strategy: data.activeStrategy.name,
                cagr: data.activeStrategy.cagr,
                sharpe: data.activeStrategy.sharpe,
                maxDrawdown: data.activeStrategy.maxDrawdown,
                baselines: data.baselines.map(
                  b =>
                    `${b.label}: CAGR ${(b.cagr * 100).toFixed(1)}%, Sharpe ${b.sharpe.toFixed(2)}, MaxDD ${(b.maxDrawdown * 100).toFixed(1)}%`
                ),
                insights: data.institutionalInsights
              })

              const caption = await generateCaption(
                'US-FDDK-REGIME',
                [],
                'showMacroFactorRegime',
                aiState,
                context
              )

              saveQuantToolResult(
                aiState,
                'showMacroFactorRegime',
                { query },
                { data },
                caption
              )

              return (
                <BotCard>
                  <MacroFactorRegimeCard data={data} />
                  <BotCaption content={caption} />
                </BotCard>
              )
            }
          },
          searchFinancialWeb: {
            description:
              'Search live financial intelligence via 2MD and synthesize a direct answer to the user from the returned evidence. Use for company profiles and business models, unknown ticker/listing verification, live news, supply chains, macro data, institutional flows, commodities, and crypto. The tool result must answer the question; a raw search-results list is not a substitute for an answer.',
            parameters: z.object({
              query: z
                .string()
                .describe('The search query for live 2MD web search.')
            }),
            generate: async function* ({ query }) {
              let caption = ''

              let results: any[] = []
              try {
                const evidence = await searchResearchEvidence({
                  question: query,
                  symbol: currentExplicitTicker,
                  mode: 'general',
                  limit: 6
                })
                results = evidence.results
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
                caption = await appendContextualFollowups(
                  `以上為您整理發布的深度報告《${title}》。已建立永久分享網址、互動簡報與電子書閱讀器。`,
                  {
                    symbol: title,
                    toolName: 'publishToDavid888Wiki',
                    question: content.trim().slice(0, 700),
                    resultContext: `報告已發布：${result.shareUrl || ''}`
                  },
                  aiState
                )
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
          本次工具模型通道未能完成請求。請稍後重新發送訊息或重試。
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
