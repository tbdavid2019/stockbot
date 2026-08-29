import * as React from 'react'
import { useState, useEffect } from 'react'
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
import {
  MarketQuotes,
  type MarketQuote
} from '@/components/tradingview/market-quotes'

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
    heading: 'AI 投資多輪大師分析',
    subheading: '特斯拉 (TSLA) 現在值得買嗎？',
    message: 'TSLA 值得買嗎？請用多位大師進行 AI 投資分析'
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
    heading: 'AI Investment Analysis',
    subheading: 'Should I buy TSLA?',
    message:
      'Should I buy TSLA? Please provide multi-analyst AI investment analysis'
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

  const [isDynamicLoaded, setIsDynamicLoaded] = useState(false)

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
            setIsDynamicLoaded(true)
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

  const handleMarketQuoteSelect = async (quote: MarketQuote) => {
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
  }

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
            <div className="mb-2 flex items-center">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {lang === 'zh'
                    ? '💡 建議提示語（點擊直接發問）：'
                    : '💡 Starter Prompts (Click to ask):'}
                </span>
                <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-950/60 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                  🔥 {lang === 'zh' ? '今日動態標的' : 'Daily Picks'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {currentExamples.map((example, index) => (
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
                  <div className="line-clamp-2 text-xs font-semibold text-slate-800 dark:text-slate-100 sm:text-sm">
                    {example.heading}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-400 sm:text-xs">
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
          <MarketQuotes onSelect={handleMarketQuoteSelect} />
        </div>
      </div>
    </div>
  )
}
