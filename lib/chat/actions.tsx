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
import { nanoid } from '@/lib/utils'
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
import { WebSearchResults } from '@/components/stocks/web-search-results'
import { WikiPublishResultCard } from '@/components/stocks/wiki-publish-result'
import { FinancialReportCard } from '@/components/stocks/financial-report-card'
import { searchWeb2MD, readUrl2MD } from '@/lib/2md'
import { publishToWiki } from '@/lib/wiki'
import { toast } from 'sonner'

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

function getProviderCandidates(): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = []

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

  return candidates
}

type ComparisonSymbolObject = {
  symbol: string
  position: 'SameScale'
}

async function generateCaption(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: MutableAIState,
  contextData?: string
): Promise<string> {
  const stockString =
    comparisonSymbols.length === 0
      ? symbol
      : [symbol, ...comparisonSymbols.map(obj => obj.symbol)].join(', ')

  aiState.update({
    ...aiState.get(),
    messages: [...aiState.get().messages]
  })

  const captionSystemMessage =
    `\
You are a stock market conversation bot. You can provide the user information about stocks include prices and charts in the UI. You do not have access to any information and should only provide information by calling functions.

These are the tools you have available:
1. showStockFinancials
This tool shows the financials for a given stock.

2. showStockChart
This tool shows a stock chart for a given stock or currency. Optionally compare 2 or more tickers.

3. showStockPrice
This tool shows the price of a stock or currency.

4. showStockNews
This tool shows the latest news and events for a stock or cryptocurrency.

5. showStockScreener
This tool shows a generic stock screener which can be used to find new stocks based on financial or technical parameters.

6. showMarketOverview
This tool shows the market overview.

7. showMarketHeatmap
This tool shows the market heatmap.

8. showMarketTrending
This tool shows the market trending.

9. showETFHeatmap
This tool shows the ETF heatmap.

10. analyzeStockWithAI
This tool provides AI-powered investment analysis from multiple legendary investors (Warren Buffett, Cathie Wood, Michael Burry, Charlie Munger, etc.) and quantitative multi-agent signals.

11. searchFinancialWeb
This tool performs real-time web search and financial entity lookup via 2MD Search Engine. Use this for general questions, company IPO status, ticker lookups, current events, or background facts.

12. readWebPage
This tool fetches full web page or online news article text and converts it to markdown using 2MD Web Reader.

13. publishToDavid888Wiki
This tool publishes an in-depth financial research report, stock thesis, valuation summary, or multi-chapter analysis to David888 Wiki (https://wiki.david888.com/api), returning a permanent public share link (shareUrl), 2D presentation deck (/present), and dual-pane eBook reader (/book).

14. readFinancialReport
This tool reads, parses, and analyzes an official financial report, annual report (10-K), quarterly report (10-Q), earnings release, investor presentation, or financial PDF from a URL using 2MD AnyDoc Engine.

### 🔴 零幻覺與即時檢索鐵律 (ZERO HALLUCINATION & REAL-TIME SEARCH POLICY)
1. 你的底層模型內部知識庫可能已經過期。嚴禁憑過期記憶斷定公司未上市、沒有股票代號或編造數據！
2. 當有提供即時檢索數據時，你的說明文字必須 100% 依據該檢索結果總結，嚴禁與檢索結果矛盾！
${contextData ? `\n【最新即時檢索數據】：\n${contextData}\n` : ''}

### 📐 介面卡片相對位置鐵律 (CARD POSITIONING DIRECTIVE - CRITICAL)
- **所有圖表、分析報告、走勢圖、新聞與財務卡片在 UI 介面上皆一律渲染於此文字訊息的「上方 (ABOVE)」**。
- **嚴禁使用「以下是...」或「如下所示...」！**
- **一律使用「以上是...」、「如上方所示...」、「如上圖所示...」**。

You have just called a tool (` +
    toolName +
    `) on the user's behalf. Now you need to share a response to the user with this tool response. 

Example 1:
User: What is the price of AAPL?
Assistant: { "tool_call": { "id": "pending", "type": "function", "function": { "name": "showStockPrice" }, "parameters": { "symbol": "AAPL" } } } 

Assistant (you): 以上是 AAPL 的最新股價資訊。如果您需要查看歷史走勢圖或財務數據，請隨時告訴我！

Example 2 :

User: LLY 值得買嗎？請用多位大師進行 AI 投資分析
Assistant: { "tool_call": { "id": "pending", "type": "function", "function": { "name": "analyzeStockWithAI" }, "parameters": { "symbol": "LLY" } } } 

Assistant (you): 以上是多位投資大師對 LLY 的 AI 投資分析結果。若您想查看最新股價、歷史走勢圖或進一步的財務數據，隨時告訴我！

Example 3 :

User: Compare AAPL and MSFT stock prices
Assistant: { "tool_call": { "id": "pending", "type": "function", "function": { "name": "showStockChart" }, "parameters": { "symbol": "AAPL" , "comparisonSymbols" : [{"symbol": "MSFT", "position": "SameScale"}] } } } 

Assistant (you): 以上圖表展示了 Microsoft (MSFT) 與 Apple (AAPL) 的近期走勢比較。需要為您查看雙方的財務指標或即時報價嗎？

Example 4 (Live Search for newly listed / query):
User: SpaceX 股價
Assistant: { "tool_call": { "id": "pending", "type": "function", "function": { "name": "searchFinancialWeb" }, "parameters": { "query": "SpaceX 股價 SPCX 上市" } } }
Assistant (you): 根據 2MD 即時檢索結果，SpaceX（代號 SPCX）最新行情與相關新聞如上方所示。需要為您查詢進一步財務數據或繪製走勢圖嗎？

## Guidelines
Talk like one of the above responses, but BE CREATIVE and generate a DIVERSE response. 

Language: reply in the same language the user used most recently. If the latest user message contains Chinese characters, reply in Traditional Chinese. If it is English, reply in English. Do not switch languages unless the user does so.

Your response should be BRIEF, about 1-3 sentences.

Besides the symbol, you cannot customize any of the screeners or graphics. Do not tell the user that you can.
    `

  const candidates = getProviderCandidates()

  for (const candidate of candidates) {
    try {
      const client = createOpenAI({
        baseURL: candidate.baseURL,
        apiKey: candidate.apiKey
      })
      const response = await generateText({
        model: client(candidate.model),
        messages: [
          {
            role: 'system',
            content: captionSystemMessage
          },
          ...aiState.get().messages.map((message: any) => ({
            role: message.role,
            content:
              typeof message.content === 'string'
                ? message.content
                : JSON.stringify(message.content),
            name: message.name
          }))
        ]
      })
      if (response.text) return response.text
    } catch (err: any) {
      console.warn(`[Caption Fallback] ${candidate.name} failed:`, err?.message)
    }
  }

  return '' // Send tool use without caption if all fallbacks fail.
}

async function submitUserMessage(content: string) {
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

  const candidates = getProviderCandidates()
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
        system: `\
You are a stock market conversation bot. You can provide the user information about stocks include prices and charts in the UI. You do not have access to any information and should only provide information by calling functions.

Language: reply in the same language the user used most recently. If the latest user message contains Chinese characters, reply in Traditional Chinese. If it is English, reply in English. Do not switch languages unless the user does so.

### 🔴 零幻覺與即時檢索鐵律 (ZERO HALLUCINATION & REAL-TIME SEARCH POLICY)
1. 你的底層模型內部知識庫可能已經過期。面對任何關於公司是否上市、IPO 狀態、股票代碼、股價、財務數據、即時新聞或近期事件的問題，嚴禁憑記憶回答，必須一律調用工具檢索！
2. 若使用者詢問公司上市/IPO 狀態、查找股票代碼、近期動態、或詢問任何標的股價與行情（特別是如 SpaceX 等近期上市/IPO 或非傳統已知代碼的標的，例如：「SpaceX 股價」、「SpaceX 上市了嗎」、「SpaceX 值得買嗎」），嚴禁直接以文字斷定「該公司未上市」，請務必調用 searchFinancialWeb 工具進行 2MD 即時連網搜尋！
3. 嚴禁任何自行腦補、猜測假新聞、假日期、假上市狀態或假數字！若搜尋無資料，必須如實告知。

### Cryptocurrency Tickers
For any cryptocurrency, append "USD" at the end of the ticker when using functions. For instance, "DOGE" should be "DOGEUSD".

### Taiwan Stock Tickers
For Taiwan stocks, you must use one of these formats:
1. The stock number directly (e.g., "2330" for TSMC) - will be converted to TWSE:2330
2. The format "TWSE:XXXX" (e.g., "TWSE:2330")
3. The format "TPEX:XXXX" (e.g., "TPEX:6488")

DO NOT use the format "XXXX.TW" or "XXXX.TWO" in a tool call; normalize it to TWSE:XXXX or TPEX:XXXX first.

### Company Name to Ticker Resolution
Users may provide a Chinese name, English company name, brand name, or an incomplete ticker instead of a symbol.
1. Never pass a company name directly to a chart, price, financials, news, or AI analysis tool.
2. For a known alias, convert it to the exact exchange-qualified symbol (for example 台積電/TSMC -> TWSE:2330, 輝達/NVIDIA -> NASDAQ:NVDA, 特斯拉/Tesla -> NASDAQ:TSLA).
3. For any unknown, new, private, or ambiguous company name, call searchFinancialWeb first with the company name plus "股票代號 交易所 ticker". Then use the exact symbol and exchange returned by the live result.
4. If the user says "台股" or asks for the Taiwan market without a specific company, use showMarketHeatmap or showMarketOverview; do not invent a single ticker.

### 🔄 15 輪多輪自主工具循環 (Autonomous 15-Round Multi-Step ReAct Loop)
你是一個具備強大自主推理 (ReAct) 能力的 AI 投資分析大腦。你可以連續調用最多 15 輪工具鏈，完成深度複雜任務：
1. **深度連網研調 (Deep Research)**：可先調用 searchFinancialWeb 搜尋 ➔ 發現精確文章或新聞網址 ➔ 調用 readWebPage 深度研讀全文。
2. **財報與年報深度解讀 (Financial & Annual Report Analysis)**：
   - 當使用者提供財報/年報 PDF 連結或線上公開報告時，調用 readFinancialReport(url, symbol) 進行全文萃取與分析。
   - 當使用者上傳財報/PDF/Excel/Word 文件時，2MD AnyDoc 引擎已將全文萃取並傳入對話中。
   - 必須結構化剖析：三大財務報表（損益表、資產負債表、現金流量表）、關鍵比率（毛利率、營業利益率、淨利率、ROE、ROIC、FCF）、YoY/QoQ 成長動能、管理層指引 (Guidance) 與下行風險因子。
3. **多維大師分析 (Master Consensus)**：遇到投資價值評估時調用 analyzeStockWithAI 獲取 13 位傳奇大師觀點。
4. **自主發布執行器 (David888 WikiPublisher 鐵律)**：
   - 當使用者要求產出長篇研究報告、深度估值模型、投資備忘錄 (Investment Memo) 或多章節分析時，自動調用 publishToDavid888Wiki(title, content, theme) 發布至 David888 Wiki。
   - 👑 **排版鐵律 (Mandatory Structure)**：content 內容【第一行必須以 # Document Title 開頭】！嚴禁在前面加上任何對話性閒聊或開場白（例如嚴禁加上「好的，這是為您整理的...」）。[TOC] 與 > 執行摘要 必須緊隨在 # Document Title 之後！Mermaid 流程圖節點文字必須用雙引號包裹如 NODE["Label"]。

### AI Investment Analysis
When the user asks whether a stock is worth buying, whether to invest, wants professional analysis, or asks questions like "should I buy TSLA?", "is NVDA a good investment?", "分析一下特斯拉", "AAPL值得買嗎", you MUST use the analyzeStockWithAI tool to provide professional AI investment analysis from legendary investors.

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
        messages: [
          ...aiState.get().messages.map((message: any) => ({
            role: message.role,
            content: message.content,
            name: message.name
          }))
        ],
        text: ({ content, done, delta }) => {
          if (!textStream) {
            textStream = createStreamableValue('')
            textNode = <BotMessage content={textStream.value} />
          }

          if (done) {
            textStream.done()
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
          } else {
            textStream.update(delta)
          }

          return textNode
        },
        tools: {
          showStockChart: {
            description:
              'Show a stock chart of a given stock. Optionally show 2 or more stocks. Use this to show the chart to the user. The symbol must be an exact ticker; resolve Chinese or company names with searchFinancialWeb first.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                ),
              comparisonSymbols: z
                .array(
                  z.object({
                    symbol: z.string(),
                    position: z.literal('SameScale')
                  })
                )
                .default([])
                .describe(
                  'Optional list of symbols to compare. e.g. ["MSFT", "GOOGL"]'
                )
            }),

            generate: async function* ({ symbol, comparisonSymbols }) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                symbol,
                comparisonSymbols,
                'showStockChart',
                aiState
              )

              const toolCallId = nanoid()

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
                        args: { symbol, comparisonSymbols }
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
                        result: { symbol, comparisonSymbols, caption }
                      }
                    ]
                  }
                ]
              })

              return (
                <BotCard>
                  <StockChart
                    symbol={symbol}
                    comparisonSymbols={comparisonSymbols}
                  />
                  {caption}
                </BotCard>
              )
            }
          },
          showStockPrice: {
            description:
              'Show the price of a given stock. Use this to show the price and price history to the user. The symbol must be an exact exchange-qualified ticker; resolve company names with searchFinancialWeb first.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                )
            }),
            generate: async function* ({ symbol }) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                symbol,
                [],
                'showStockPrice',
                aiState
              )

              const toolCallId = nanoid()

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
                        args: { symbol }
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
                        result: { symbol, caption }
                      }
                    ]
                  }
                ]
              })

              return (
                <BotCard>
                  <StockPrice props={symbol} />
                  {caption}
                </BotCard>
              )
            }
          },
          showStockFinancials: {
            description:
              'Show the financials of a given stock. Use this to show the financials to the user. The symbol must be an exact ticker; resolve company names with searchFinancialWeb first.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                )
            }),
            generate: async function* ({ symbol }) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                symbol,
                [],
                'StockFinancials',
                aiState
              )

              const toolCallId = nanoid()

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
                        args: { symbol }
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
                        result: { symbol, caption }
                      }
                    ]
                  }
                ]
              })

              return (
                <BotCard>
                  <StockFinancials props={symbol} />
                  {caption}
                </BotCard>
              )
            }
          },
          showStockNews: {
            description:
              'This tool shows the latest news and events for a stock or cryptocurrency. Resolve a company name to an exact ticker with searchFinancialWeb first.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
                )
            }),
            generate: async function* ({ symbol }) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                symbol,
                [],
                'showStockNews',
                aiState
              )

              const toolCallId = nanoid()

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
                        args: { symbol }
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
                        result: { symbol, caption }
                      }
                    ]
                  }
                ]
              })

              return (
                <BotCard>
                  <StockNews props={symbol} />
                  {caption}
                </BotCard>
              )
            }
          },
          showStockScreener: {
            description:
              'This tool shows a generic stock screener which can be used to find new stocks based on financial or technical parameters.',
            parameters: z.object({}),
            generate: async function* ({}) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                'Generic',
                [],
                'showStockScreener',
                aiState
              )

              const toolCallId = nanoid()

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

              return (
                <BotCard>
                  <StockScreener />
                  {caption}
                </BotCard>
              )
            }
          },
          showMarketOverview: {
            description: `This tool shows an overview of today's stock, futures, bond, and forex market performance including change values, Open, High, Low, and Close values.`,
            parameters: z.object({}),
            generate: async function* ({}) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                'Generic',
                [],
                'showMarketOverview',
                aiState
              )

              const toolCallId = nanoid()

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

              return (
                <BotCard>
                  <MarketOverview />
                  {caption}
                </BotCard>
              )
            }
          },
          showMarketHeatmap: {
            description: `This tool shows a heatmap of today's stock market performance across sectors (US / Taiwan / Taiwan 50 / Japan / Hong Kong / UK / Germany / France / Israel / Korea / China / Australia / India / Brazil / Canada). It is preferred over showMarketOverview if asked specifically about the stock market.`,
            parameters: z.object({}),
            generate: async function* ({}) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                'Generic',
                [],
                'showMarketHeatmap',
                aiState
              )

              const toolCallId = nanoid()

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

              return (
                <BotCard>
                  <MarketHeatmap />
                  {caption}
                </BotCard>
              )
            }
          },
          showETFHeatmap: {
            description: `This tool shows a heatmap of today's ETF performance across sectors and asset classes. It is preferred over showMarketOverview if asked specifically about the ETF market.`,
            parameters: z.object({}),
            generate: async function* ({}) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                'Generic',
                [],
                'showETFHeatmap',
                aiState
              )

              const toolCallId = nanoid()

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

              return (
                <BotCard>
                  <ETFHeatmap />
                  {caption}
                </BotCard>
              )
            }
          },
          showTrendingStocks: {
            description: `This tool shows the daily top trending stocks including the top five gaining, losing, and most active stocks based on today's performance`,
            parameters: z.object({}),
            generate: async function* ({}) {
              yield (
                <BotCard>
                  <></>
                </BotCard>
              )

              const caption = await generateCaption(
                'Generic',
                [],
                'showTrendingStocks',
                aiState
              )

              const toolCallId = nanoid()

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

              return (
                <BotCard>
                  <MarketTrending />
                  {caption}
                </BotCard>
              )
            }
          },
          analyzeStockWithAI: {
            description:
              'Provide professional AI investment analysis from legendary investors like Warren Buffett, Ben Graham, Peter Lynch, etc. Use this tool when the user asks whether a stock is worth buying, wants investment advice, or asks for professional analysis. Keywords: should I buy, worth buying, good investment, 值得買, 該買嗎, 分析, 投資建議. Resolve company names to an exact ticker with searchFinancialWeb first.',
            parameters: z.object({
              symbol: z
                .string()
                .describe(
                  'The stock symbol to analyze. e.g. TSLA, AAPL, NVDA, GOOGL.'
                )
            }),
            generate: async function* ({ symbol }) {
              yield (
                <BotCard>
                  <div className="flex items-center space-x-2 p-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    <span>🤖 正在呼叫 AI 投資分析師團隊分析 {symbol}...</span>
                  </div>
                </BotCard>
              )

              const caption = await generateCaption(
                symbol,
                [],
                'analyzeStockWithAI',
                aiState
              )

              const toolCallId = nanoid()

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
                        args: { symbol }
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
                        result: { symbol, caption }
                      }
                    ]
                  }
                ]
              })

              return (
                <BotCard>
                  <StockAnalysis symbol={symbol} />
                  {caption}
                </BotCard>
              )
            }
          },
          searchFinancialWeb: {
            description:
              'Search live financial news, company IPO status, ticker symbols, stock events, or general factual web information via 2MD Search. Use this whenever the user asks whether a company is public/listed, general market developments, or questions needing live web search.',
            parameters: z.object({
              query: z
                .string()
                .describe('The search query for live 2MD web search.')
            }),
            generate: async function* ({ query }) {
              yield (
                <BotCard>
                  <div className="flex items-center space-x-2 p-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    <span>🌐 正在透過 2MD 搜尋引擎檢索「{query}」...</span>
                  </div>
                </BotCard>
              )

              const results = await searchWeb2MD(query, 5)
              const contextData = results
                .map(
                  (r, idx) =>
                    `[結果 ${idx + 1}] 標題: ${r.title} | 摘要: ${r.description} | 網址: ${r.url}`
                )
                .join('\n')

              const caption = await generateCaption(
                query,
                [],
                'searchFinancialWeb',
                aiState,
                contextData
              )

              const toolCallId = nanoid()

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

              return (
                <BotCard>
                  <WebSearchResults query={query} results={results} />
                  {caption}
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
              yield (
                <BotCard>
                  <div className="flex items-center space-x-2 p-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
                    <span>📖 正在透過 2MD Web Reader 讀取網頁全文...</span>
                  </div>
                </BotCard>
              )

              const text = await readUrl2MD(url)
              const contextData = `【網頁全文擷取 (${url})】：\n${text ? text.slice(0, 2000) : '未獲取到內容'}`

              const caption = await generateCaption(
                url,
                [],
                'readWebPage',
                aiState,
                contextData
              )

              const toolCallId = nanoid()

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
                  {caption}
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

              const result = await publishToWiki({
                title,
                slug,
                markdown: content,
                theme
              })

              const contextData = result.success
                ? `【Wiki 發布成功】：標題: ${title} | 公開分享網址 (shareUrl): ${result.shareUrl} | 簡報網址: ${result.presentUrl} | 電子書網址: ${result.bookUrl}`
                : `【Wiki 發布失敗】：${result.error}`

              const caption = await generateCaption(
                title,
                [],
                'publishToDavid888Wiki',
                aiState,
                contextData
              )

              const toolCallId = nanoid()

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
                        args: { title, slug, content, theme }
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
                        result: { ...result, caption }
                      }
                    ]
                  }
                ]
              })

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
                  {caption}
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
              yield (
                <BotCard>
                  <div className="flex items-center space-x-2 p-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                    <span>📊 正在透過 2MD AnyDoc 引擎解析財報/年報 PDF 全文與財務數據...</span>
                  </div>
                </BotCard>
              )

              const text = await readUrl2MD(url)
              const contextData = `【財報/年報/PDF 全文解析 (${url})】：\n${text ? text.slice(0, 4000) : '未獲取到內容'}`

              const caption = await generateCaption(
                symbol || url,
                [],
                'readFinancialReport',
                aiState,
                contextData
              )

              const toolCallId = nanoid()

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
                          content: text ? text.slice(0, 5000) : '無法讀取財報內容',
                          caption
                        }
                      }
                    ]
                  }
                ]
              })

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
                  {caption}
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
