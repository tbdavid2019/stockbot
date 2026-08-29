import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { IconShare } from '@/components/ui/icons'
import { FooterText } from '@/components/footer'
import { useAIState, useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { type MarketQuote } from '@/components/tradingview/market-quotes'

export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
  wide?: boolean
}

interface ExampleMessage {
  heading: string
  subheading: string
  message: string
}

const promptLabelsZh = [
  '💡 今天想先看哪個市場？',
  '📈 挑一張卡，直接問！',
  '🔥 盤前先掃一輪？',
  '🧭 從行情到財報，隨手挑一題',
  '⚡ 今日市場靈感，換你出題'
]

const promptLabelsEn = [
  '💡 What should we check first?',
  '📈 Pick a card and ask away!',
  '🔥 Ready for a market scan?',
  '🧭 From price action to financials',
  '⚡ Market inspiration for today'
]

function shufflePrompts(prompts: ExampleMessage[]) {
  return [...prompts].sort(() => Math.random() - 0.5).slice(0, 6)
}

const exampleMessagesZh: ExampleMessage[] = [
  {
    heading: '台積電 (2330) 現價',
    subheading: '查詢台積電即時股價',
    message: '台積電 2330 目前股價是多少？'
  },
  {
    heading: '查看 Google 走勢圖',
    subheading: '顯示 $GOOGL 即時走勢圖',
    message: '幫我顯示 GOOGL 的股票圖表'
  },
  {
    heading: '傳奇大師多維投資評估',
    subheading: '特斯拉 (TSLA) 現在值得買嗎？',
    message: 'TSLA 值得買嗎？請用多位大師進行深度投資價值評估'
  },
  {
    heading: '微軟最新財務數據',
    subheading: '微軟 (MSFT) 最新財報狀況',
    message: '微軟 MSFT 最近的財務數據如何？'
  },
  {
    heading: '今日美股產業表現',
    subheading: '查看各產業板塊熱力圖',
    message: '今天股票市場各產業表現如何？'
  },
  {
    heading: '📑 財報與年報深度解讀',
    subheading: '點擊 📎 上傳 PDF 或輸入財報網址',
    message:
      '請告訴我可以如何上傳公司財報 PDF 或輸入財報網址讓您進行深度財務比率與大師投資分析？'
  }
]

const exampleMessagesEn: ExampleMessage[] = [
  {
    heading: 'What is the price',
    subheading: 'of Apple Inc.?',
    message: 'What is the price of Apple stock?'
  },
  {
    heading: 'Show me a stock chart',
    subheading: 'for $GOOGL',
    message: 'Show me a stock chart for $GOOGL'
  },
  {
    heading: 'Legendary Master Valuation',
    subheading: 'Should I buy TSLA?',
    message:
      'Should I buy TSLA? Please provide multi-analyst investment valuation'
  },
  {
    heading: `What are Microsoft's`,
    subheading: 'latest financials?',
    message: `What are Microsoft's latest financials?`
  },
  {
    heading: 'How is the stock market',
    subheading: 'performing today by sector?',
    message: `How is the stock market performing today by sector?`
  },
  {
    heading: '📑 Financial Report & PDF Analysis',
    subheading: 'Click 📎 or provide report URL',
    message:
      'How can I upload a financial report PDF or provide a 10-K URL for in-depth ratio and master investor analysis?'
  }
]

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom,
  wide = false
}: ChatPanelProps) {
  const [aiState] = useAIState()
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  const [cachedPromptsZh, setCachedPromptsZh] = useLocalStorage<
    ExampleMessage[]
  >('stockbot_cached_prompts_zh', exampleMessagesZh)
  const [cachedPromptsEn, setCachedPromptsEn] = useLocalStorage<
    ExampleMessage[]
  >('stockbot_cached_prompts_en', exampleMessagesEn)

  const [visibleExamples, setVisibleExamples] =
    useState<ExampleMessage[]>(exampleMessagesZh)
  const [promptLabelIndex, setPromptLabelIndex] = useState(0)

  useEffect(() => {
    let isMounted = true
    async function loadDynamicPrompts() {
      try {
        const res = await fetch('/api/dynamic-prompts')
        if (res.ok) {
          const data = await res.json()
          if (isMounted) {
            if (data.promptsZh && data.promptsZh.length > 0) {
              setCachedPromptsZh(data.promptsZh)
            }
            if (data.promptsEn && data.promptsEn.length > 0) {
              setCachedPromptsEn(data.promptsEn)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic prompts:', err)
      }
    }
    loadDynamicPrompts()
    return () => {
      isMounted = false
    }
  }, [])

  const currentExamples = lang === 'zh' ? cachedPromptsZh : cachedPromptsEn
  const promptLabels = lang === 'zh' ? promptLabelsZh : promptLabelsEn

  useEffect(() => {
    setVisibleExamples(shufflePrompts(currentExamples))
    setPromptLabelIndex(Math.floor(Math.random() * promptLabels.length))
  }, [currentExamples, promptLabels.length])

  const handleMarketQuoteSelect = useCallback(
    async (quote: MarketQuote) => {
      const prompt =
        lang === 'en'
          ? `What are the latest financial results and key metrics for ${quote.name} (${quote.symbol})?`
          : `${quote.name}（${quote.symbol}）最新財務數據如何？`

      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          display: <UserMessage>{prompt}</UserMessage>
        }
      ])

      const responseMessage = await submitUserMessage(prompt)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    },
    [lang, setMessages, submitUserMessage]
  )

  useEffect(() => {
    const handleMarketQuoteEvent = (event: Event) => {
      const quote = (event as CustomEvent<MarketQuote>).detail
      if (quote) void handleMarketQuoteSelect(quote)
    }

    window.addEventListener('stockbot-market-quote', handleMarketQuoteEvent)
    return () =>
      window.removeEventListener(
        'stockbot-market-quote',
        handleMarketQuoteEvent
      )
  }, [handleMarketQuoteSelect])

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] w-full overflow-x-hidden overflow-y-auto bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% pb-[env(safe-area-inset-bottom)] duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div
        className={`mx-auto sm:px-4 ${wide ? 'sm:max-w-6xl' : 'sm:max-w-2xl'}`}
      >
        {messages.length === 0 && (
          <div className="mb-4 px-3 sm:px-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {promptLabels[promptLabelIndex]}
                </span>
                <a
                  href="https://stock.david888.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/70"
                >
                  📡 stock.david888.com 模板
                </a>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setVisibleExamples(shufflePrompts(currentExamples))
                  setPromptLabelIndex(
                    Math.floor(Math.random() * promptLabels.length)
                  )
                }}
                aria-label={lang === 'zh' ? '換一批提示' : 'Show new prompts'}
              >
                ↻ {lang === 'zh' ? '換一批' : 'Shuffle'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {visibleExamples.map((example, index) => (
                <div
                  key={`${lang}-${example.heading}-${index}`}
                  className="cursor-pointer rounded-lg border bg-white p-2.5 shadow-2xs transition-all hover:border-blue-300 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:border-blue-700 dark:hover:bg-zinc-900 sm:p-3.5"
                  onClick={async () => {
                    setMessages(currentMessages => [
                      ...currentMessages,
                      {
                        id: nanoid(),
                        display: <UserMessage>{example.message}</UserMessage>
                      }
                    ])

                    const responseMessage = await submitUserMessage(
                      example.message
                    )
                    setMessages(currentMessages => [
                      ...currentMessages,
                      responseMessage
                    ])
                  }}
                >
                  <div className="line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100 sm:text-base">
                    {example.heading}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
                    {example.subheading}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:border md:py-4">
          <PromptForm input={input} setInput={setInput} />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
