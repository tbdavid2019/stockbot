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

export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
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
    heading: '股票篩選器',
    subheading: '尋找潛力新標的',
    message: '顯示股票篩選器來尋找新股票'
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
    message: 'Should I buy TSLA? Please provide multi-analyst AI investment analysis'
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
    heading: 'Show me a screener',
    subheading: 'to find new stocks',
    message: 'Show me a screener to find new stocks'
  }
]

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom
}: ChatPanelProps) {
  const [aiState] = useAIState()
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()
  const [lang, setLang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  const [cachedPromptsZh, setCachedPromptsZh] = useLocalStorage<ExampleMessage[]>(
    'stockbot_cached_prompts_zh',
    exampleMessagesZh
  )
  const [cachedPromptsEn, setCachedPromptsEn] = useLocalStorage<ExampleMessage[]>(
    'stockbot_cached_prompts_en',
    exampleMessagesEn
  )

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

  return (
    <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div className="mx-auto sm:max-w-2xl sm:px-4">
        {messages.length === 0 && (
          <div className="mb-4 px-4 sm:px-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {lang === 'zh'
                    ? '💡 建議提示語（點擊直接發問）：'
                    : '💡 Starter Prompts (Click to ask):'}
                </span>
                <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-950/60 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                  🔥 {lang === 'zh' ? '今日動態標的' : 'Daily Picks'}
                </span>
              </div>
              <div className="inline-flex rounded-lg border bg-muted/60 p-0.5 text-xs shadow-sm">
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    lang === 'zh'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setLang('zh')}
                >
                  🇹🇼 繁體中文
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    lang === 'en'
                      ? 'bg-background text-foreground shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setLang('en')}
                >
                  🇺🇸 English
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentExamples.map((example, index) => (
                <div
                  key={`${lang}-${example.heading}-${index}`}
                  className="cursor-pointer border bg-white p-3.5 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 rounded-lg transition-all shadow-2xs hover:border-blue-300 dark:hover:border-blue-700"
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
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{example.heading}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
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
