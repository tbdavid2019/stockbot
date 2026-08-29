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

const promptModesZh = [
  '🎲 隨機靈感',
  '📊 市場雷達',
  '🧭 深度拆解',
  '⚡ 快問快答'
]
const promptModesEn = [
  '🎲 Random picks',
  '📊 Market radar',
  '🧭 Deep dive',
  '⚡ Quick scan'
]

function shufflePrompts(
  prompts: ExampleMessage[],
  previousPrompts: ExampleMessage[] = []
) {
  const makeBatch = () => {
    const shuffled = [...prompts]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const currentPrompt = shuffled[index]
      shuffled[index] = shuffled[swapIndex]
      shuffled[swapIndex] = currentPrompt
    }
    return shuffled.slice(0, 6)
  }

  let nextBatch = makeBatch()
  let attempts = 0
  while (
    prompts.length > 6 &&
    previousPrompts.length > 0 &&
    nextBatch.every(prompt =>
      previousPrompts.some(previous => previous.message === prompt.message)
    ) &&
    attempts < 8
  ) {
    nextBatch = makeBatch()
    attempts += 1
  }
  return nextBatch
}

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
  const [apiKey] = useLocalStorage('groqKey', '')

  const [cachedPromptsZh, setCachedPromptsZh] = useState<ExampleMessage[]>([])
  const [cachedPromptsEn, setCachedPromptsEn] = useState<ExampleMessage[]>([])

  const [visibleExamples, setVisibleExamples] = useState<ExampleMessage[]>([])
  const [promptLabelIndex, setPromptLabelIndex] = useState(0)
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true)

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
            setIsLoadingPrompts(false)
          }
        } else if (isMounted) {
          setIsLoadingPrompts(false)
        }
      } catch (err) {
        console.error('Failed to load dynamic prompts:', err)
        if (isMounted) setIsLoadingPrompts(false)
      }
    }
    loadDynamicPrompts()
    return () => {
      isMounted = false
    }
  }, [setCachedPromptsEn, setCachedPromptsZh])

  const currentExamples = lang === 'zh' ? cachedPromptsZh : cachedPromptsEn
  const promptLabels = lang === 'zh' ? promptLabelsZh : promptLabelsEn
  const promptModes = lang === 'zh' ? promptModesZh : promptModesEn

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

      const responseMessage = await submitUserMessage(prompt, apiKey)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    },
    [apiKey, lang, setMessages, submitUserMessage]
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
                <span className="inline-flex items-center rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                  {promptModes[promptLabelIndex % promptModes.length]}
                </span>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setVisibleExamples(
                    shufflePrompts(currentExamples, visibleExamples)
                  )
                  setPromptLabelIndex(
                    Math.floor(Math.random() * promptLabels.length)
                  )
                }}
                aria-label={lang === 'zh' ? '換一批提示' : 'Show new prompts'}
              >
                ↻ {lang === 'zh' ? '換一批' : 'Shuffle'}
              </button>
            </div>
            {isLoadingPrompts ? (
              <div className="rounded-lg border border-dashed bg-background/50 px-3 py-4 text-sm text-muted-foreground">
                {lang === 'zh'
                  ? '正在載入最新市場標的…'
                  : 'Loading the latest market symbols…'}
              </div>
            ) : visibleExamples.length > 0 ? (
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
                        example.message,
                        apiKey
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
            ) : (
              <div className="rounded-lg border border-dashed bg-background/50 px-3 py-4 text-sm text-muted-foreground">
                {lang === 'zh'
                  ? '目前無法取得即時標的，請稍後重新整理。'
                  : 'Live market symbols are unavailable. Please refresh shortly.'}
              </div>
            )}
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
