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
import { searchWeb2MD } from '@/lib/2md'
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

const PRIMARY_BASE_URL = process.env.OPENAI_BASE_URL || process.env.NEN_BASE_URL || 'https://nen.com.tw/v1'
const PRIMARY_API_KEY = process.env.OPENAI_API_KEY || process.env.NEN_API_KEY || 'sk-XqYJN7YDjomSEeOPn9GsHvSpspYLuQrxdgQc2zcA3kvuZD34'

// Fallback Model Candidates List (Tried in sequence if previous model or channel fails)
function getFallbackModelList(): string[] {
  const envModel = process.env.MODEL || process.env.TOOL_MODEL
  const models = [
    // Sanitize: Ignore stale / dead channels like gpt-oss-20b
    ...(envModel && !envModel.includes('gpt-oss') ? [envModel] : []),
    'deepseek-v4-flash',
    'qwen3.5-flash',
    'gemini-2.5-flash',
    'deepseek-v3.2',
    'qwen3.6-flash'
  ]
  return Array.from(new Set(models))
}

function getAIClient(overrideBaseUrl?: string, overrideApiKey?: string) {
  return createOpenAI({
    baseURL: overrideBaseUrl || PRIMARY_BASE_URL,
    apiKey: overrideApiKey || PRIMARY_API_KEY
  })
}

type ComparisonSymbolObject = {
  symbol: string;
  position: "SameScale";
};

async function generateCaption(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: MutableAIState,
  contextData?: string
): Promise<string> {
  const stockString = comparisonSymbols.length === 0
  ? symbol
  : [symbol, ...comparisonSymbols.map(obj => obj.symbol)].join(', ');

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

Example:
User: What is the price of AAPL?
Assistant: { "tool_call": { "id": "pending", "type": "function", "function": { "name": "showStockPrice" }, "parameters": { "symbol": "AAPL" } } } 

Assistant (you): 以上是 AAPL 的最新股價資訊。如果您需要查看歷史走勢圖或財務數據，請隨時告訴我！

## Guidelines
Talk like one of the above responses, but BE CREATIVE and generate a DIVERSE response. 

Language: reply in the same language the user used most recently. If the latest user message contains Chinese characters, reply in Traditional Chinese. If it is English, reply in English. Do not switch languages unless the user does so.

Your response should be BRIEF, about 1-3 sentences.

Besides the symbol, you cannot customize any of the screeners or graphics. Do not tell the user that you can.
    `

  const models = getFallbackModelList()
  const ai = getAIClient()

  for (const modelName of models) {
    try {
      const response = await generateText({
        model: ai(modelName),
        messages: [
          {
            role: 'system',
            content: captionSystemMessage
          },
          ...aiState.get().messages.map((message: any) => ({
            role: message.role,
            content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
            name: message.name
          }))
        ]
      })
      if (response.text) return response.text
    } catch (err: any) {
      console.warn(`[Caption Fallback] Model ${modelName} failed:`, err?.message)
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

  const models = getFallbackModelList()
  const ai = getAIClient()
  let lastError: any = null

  for (const modelName of models) {
    try {
      const result = await streamUI({
        model: ai(modelName),
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
3. The format "TPE:XXXX" (e.g., "TPE:2330")

DO NOT use the format "XXXX.TW" as it is not supported by the system.

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

Example 4:

User: SpaceX 上市了嗎？
Assistant (you): { "tool_call": { "id": "pending", "type": "function", "function": { "name": "searchFinancialWeb" }, "parameters": { "query": "SpaceX 上市 IPO 股票代號" } } }
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
            'Show a stock chart of a given stock. Optionally show 2 or more stocks. Use this to show the chart to the user.',
          parameters: z.object({
            symbol: z
              .string()
              .describe(
                'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
              ),
            comparisonSymbols: z.array(z.object({
              symbol: z.string(),
              position: z.literal("SameScale")
            }))
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
                      result: { symbol, comparisonSymbols }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              symbol,
              comparisonSymbols,
              'showStockChart',
              aiState
            )

            return (
              <BotCard>
                <StockChart symbol={symbol} comparisonSymbols={comparisonSymbols} />
                {caption}
              </BotCard>
            )
          }
        },
        showStockPrice: {
          description:
            'Show the price of a given stock. Use this to show the price and price history to the user.',
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
                      result: { symbol }
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              symbol,
              [],
              'showStockPrice',
              aiState
            )

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
            'Show the financials of a given stock. Use this to show the financials to the user.',
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
                      result: { symbol }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              symbol,
              [],
              'StockFinancials',
              aiState
            )

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
            'This tool shows the latest news and events for a stock or cryptocurrency.',
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
                      result: { symbol }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              symbol,
              [],
              'showStockNews',
              aiState
            )

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
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
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
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showStockScreener',
              aiState
            )

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
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
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
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showMarketOverview',
              aiState
            )

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
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
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
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showMarketHeatmap',
              aiState
            )

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
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
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
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showETFHeatmap',
              aiState
            )

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
          generate: async function* ({ }) {
            yield (
              <BotCard>
                <></>
              </BotCard>
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
                      result: {}
                    }
                  ]
                }
              ]
            })
            const caption = await generateCaption(
              'Generic',
              [],
              'showTrendingStocks',
              aiState
            )

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
            'Provide professional AI investment analysis from legendary investors like Warren Buffett, Ben Graham, Peter Lynch, etc. Use this tool when the user asks whether a stock is worth buying, wants investment advice, or asks for professional analysis. Keywords: should I buy, worth buying, good investment, 值得買, 該買嗎, 分析, 投資建議',
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
                      result: { symbol }
                    }
                  ]
                }
              ]
            })

            const caption = await generateCaption(
              symbol,
              [],
              'analyzeStockWithAI',
              aiState
            )

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
                      result: { query, results }
                    }
                  ]
                }
              ]
            })

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

            return (
              <BotCard>
                <WebSearchResults query={query} results={results} />
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
      console.warn(`[StreamUI Fallback] Model ${modelName} failed:`, err?.message || err)
      lastError = err
    }
  }

  // If all fallback models failed:
  return {
    id: nanoid(),
    display: (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
        <div className="text-amber-800 dark:text-amber-300 font-semibold text-sm">
          ⚠️ AI 對話模型服務暫時無法取得回應（{lastError?.message || '通道切換中'}）
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          已自動嘗試多個備用模型通道（DeepSeek、Qwen、Gemini 等）。請稍後重新發送訊息或重試。
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
