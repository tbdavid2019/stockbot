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
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'
import { type MarketQuote } from '@/components/tradingview/market-quotes'
import { Radio, Calendar, Activity, Sparkles, RotateCw, ArrowRight } from 'lucide-react'

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
  '近期台股/美股法人說明會與簡報',
  '今晚重大總經與即時日曆',
  '盤前美股期指與跨資產風向',
  '非農就業與央行政策時程',
  '今天想先看哪個市場？',
  '挑一張卡，直接問！',
  '盤前先掃一輪？',
  '從行情到財報，隨手挑一題',
  '今日市場靈感，換你出題'
]

const promptLabelsEn = [
  'Corporate Earnings Calls & Webcasts',
  'Global Economic Calendar Tonight',
  'US Pre-Market Futures & Macro Radar',
  'NFP & Central Bank Decisions',
  'What should we check first?',
  'Pick a card and ask away!',
  'Ready for a market scan?',
  'From price action to financials',
  'Market inspiration for today'
]

const promptModesZh = [
  '法說日程',
  '總經日曆',
  '盤前風向',
  '隨機靈感',
  '市場雷達',
  '深度拆解',
  '快問快答'
]
const promptModesEn = [
  'Earnings Calls',
  'Macro Calendar',
  'Pre-market Scan',
  'Random picks',
  'Market radar',
  'Deep dive',
  'Quick scan'
]

const DEFAULT_FEATURED_ZH: ExampleMessage[] = [
  {
    heading: '近期台股/美股法人說明會 (Earnings Calls)',
    subheading: '即時掌握台積電、聯發科、輝達法說日程、影音直播與簡報下載',
    message: '近期台股與美股有哪些法人說明會？'
  },
  {
    heading: '今晚有什麼重大總經數據？',
    subheading: '即時掌握非農 (NFP)、CPI、PMI、零售銷售與央行決議時程',
    message: '今晚有什麼重大總經數據？'
  },
  {
    heading: '美股盤前期貨與經濟日曆',
    subheading: '美股三大期指盤前行情、恐慌指數 VIX 與跨資產風向',
    message: '美股盤前期貨與經濟日曆'
  }
]

const DEFAULT_FEATURED_EN: ExampleMessage[] = [
  {
    heading: 'Corporate Earnings Calls & Webcasts',
    subheading: 'Live earnings conference calendar, guidance highlights & slide deck downloads',
    message: 'Show me upcoming corporate earnings calls and investor conferences'
  },
  {
    heading: 'Key Economic Events Tonight',
    subheading: 'Live global economic calendar, CPI, NFP & central bank policy',
    message: 'What are the key global economic events and data releases tonight?'
  },
  {
    heading: 'US Pre-Market Futures & Macro Calendar',
    subheading: 'Live S&P, Nasdaq futures and Risk-On / Risk-Off sentiment',
    message: 'Show me US pre-market futures and economic calendar'
  }
]

const DEFAULT_PROMPTS_ZH: ExampleMessage[] = [
  ...DEFAULT_FEATURED_ZH,
  {
    heading: '台積電 (2330) 法人說明會日程與簡報',
    subheading: '查看法說會官方簡報 (PDF)、影音直播與經營層指引',
    message: '查詢台積電 (2330) 最近的法人說明會與簡報'
  },
  {
    heading: '台積電 (2330) 即時股價',
    subheading: '查詢現價行情與即時跳動點位',
    message: '台積電 2330 目前股價是多少？'
  },
  {
    heading: '台積電 (2330) 最新財務數據',
    subheading: '查看營收、毛利、本益比與估值狀況',
    message: '請整理台積電 (2330) 最新財務數據與估值'
  },
  {
    heading: '鴻海 (2317) 走勢診斷',
    subheading: '用波段、均線與成交量拆解走勢',
    message: '請分析鴻海 (2317) 目前的趨勢、量價與支撐壓力'
  },
  {
    heading: '聯發科 (2454) 供應鏈地圖',
    subheading: '找出上下游與同產業連動標的',
    message: '請整理聯發科 (2454) 的供應鏈與相關概念股'
  },
  {
    heading: '今日台股大盤市場概況',
    subheading: '查看加權指數、成交量與強弱勢類股',
    message: '今天台股表現如何？市場概況總覽'
  },
  {
    heading: 'NVDA 股票走勢圖',
    subheading: '顯示即時走勢與技術線圖',
    message: '幫我顯示 NVDA 的股票走勢圖表'
  },
  {
    heading: 'Apple (AAPL) 大師觀點',
    subheading: '多位投資大師圓桌分析',
    message: '請用多位投資大師分析股票代號 AAPL（Apple）的投資價值'
  },
  {
    heading: '今日美股市場板塊熱力圖',
    subheading: '查看 S&P 500 各產業漲跌與板塊輪動',
    message: '幫我顯示美股市場熱力圖'
  }
]

const DEFAULT_PROMPTS_EN: ExampleMessage[] = [
  ...DEFAULT_FEATURED_EN,
  {
    heading: 'TSMC (2330) current price',
    subheading: 'Live quote and market context',
    message: 'What is the current price of TSMC (2330)?'
  },
  {
    heading: 'TSMC (2330) latest financials',
    subheading: 'Revenue, earnings and valuation',
    message: 'Summarize the latest financials and valuation for TSMC (2330)'
  },
  {
    heading: 'Hon Hai (2317) technical check',
    subheading: 'Trend, volume, support and resistance',
    message: 'Analyze the trend, volume, support and resistance for Hon Hai (2317)'
  },
  {
    heading: 'Taiwan & Global market overview',
    subheading: 'TAIEX index trends, turnover and key sector drivers',
    message: 'How is the Taiwan stock market performing today? Market overview'
  },
  {
    heading: 'NVDA stock chart',
    subheading: 'Interactive price action and trends',
    message: 'Show me a stock chart for NVDA'
  },
  {
    heading: 'Apple (AAPL) investor view',
    subheading: 'Multi-analyst investment perspective',
    message: 'Give me a multi-analyst investment view of ticker AAPL (Apple)'
  },
  {
    heading: 'US sector performance heatmap',
    subheading: 'S&P 500 industry heatmap and sector rotation',
    message: 'Show me the US stock market heatmap'
  }
]

function shufflePrompts(
  prompts: ExampleMessage[],
  previousPrompts: ExampleMessage[] = [],
  featured: ExampleMessage[] = []
) {
  // Always guarantee the Earnings Call card is pinned at slot 0
  const earningsCallPrompt =
    featured.find(f => /法說|earnings\s*call/i.test(`${f.heading} ${f.message}`)) ||
    prompts.find(p => /法說|earnings\s*call/i.test(`${p.heading} ${p.message}`))

  // Select 1 distinct macro prompt (excluding earnings calls)
  const macroPool = featured.filter(
    f => !/法說|earnings\s*call/i.test(`${f.heading} ${f.message}`)
  )
  const shuffledMacro = [...macroPool].sort(() => 0.5 - Math.random())
  const macroPrompt = shuffledMacro[0]

  const featuredBatch: ExampleMessage[] = []
  if (earningsCallPrompt) {
    featuredBatch.push(earningsCallPrompt)
  }
  if (macroPrompt && !featuredBatch.some(f => f.message === macroPrompt.message)) {
    featuredBatch.push(macroPrompt)
  }

  const pool = prompts.filter(
    p => !featuredBatch.some(f => f.message === p.message)
  )

  const makeBatch = () => {
    const shuffled = [...pool]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      const currentPrompt = shuffled[index]
      shuffled[index] = shuffled[swapIndex]
      shuffled[swapIndex] = currentPrompt
    }
    const needed = Math.max(0, 6 - featuredBatch.length)
    return [...featuredBatch, ...shuffled.slice(0, needed)]
  }

  let nextBatch = makeBatch()
  let attempts = 0
  while (
    pool.length > 6 &&
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
  const { serializedConfig } = useUserApiKey()

  const [cachedPromptsZh, setCachedPromptsZh] =
    useState<ExampleMessage[]>(DEFAULT_PROMPTS_ZH)
  const [cachedPromptsEn, setCachedPromptsEn] =
    useState<ExampleMessage[]>(DEFAULT_PROMPTS_EN)
  const [featuredZh, setFeaturedZh] =
    useState<ExampleMessage[]>(DEFAULT_FEATURED_ZH)
  const [featuredEn, setFeaturedEn] =
    useState<ExampleMessage[]>(DEFAULT_FEATURED_EN)

  // Stable deterministic initial batch based on lang; NEVER flicker or swap automatically on mount
  const [visibleExamples, setVisibleExamples] = useState<ExampleMessage[]>(() =>
    lang === 'zh' ? DEFAULT_PROMPTS_ZH.slice(0, 6) : DEFAULT_PROMPTS_EN.slice(0, 6)
  )
  const [promptLabelIndex, setPromptLabelIndex] = useState(0)
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const prevLangRef = React.useRef(lang)

  // Background fetch only updates the cached pool for the NEXT shuffle; does NOT replace current visible cards!
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
            if (data.featuredPromptsZh && data.featuredPromptsZh.length > 0) {
              setFeaturedZh(data.featuredPromptsZh)
            }
            if (data.featuredPromptsEn && data.featuredPromptsEn.length > 0) {
              setFeaturedEn(data.featuredPromptsEn)
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
  }, [])

  // Only switch visible prompts when the user explicitly switches language
  useEffect(() => {
    if (prevLangRef.current !== lang) {
      prevLangRef.current = lang
      const pool = lang === 'zh' ? cachedPromptsZh : cachedPromptsEn
      setVisibleExamples(pool.slice(0, 6))
    }
  }, [lang, cachedPromptsZh, cachedPromptsEn])

  const currentExamples = lang === 'zh' ? cachedPromptsZh : cachedPromptsEn
  const currentFeatured = lang === 'zh' ? featuredZh : featuredEn
  const promptLabels = lang === 'zh' ? promptLabelsZh : promptLabelsEn
  const promptModes = lang === 'zh' ? promptModesZh : promptModesEn
  const displayExamples =
    visibleExamples.length > 0
      ? visibleExamples
      : lang === 'zh'
        ? DEFAULT_PROMPTS_ZH.slice(0, 6)
        : DEFAULT_PROMPTS_EN.slice(0, 6)

  const handleShuffle = useCallback(() => {
    setVisibleExamples(
      shufflePrompts(currentExamples, visibleExamples, currentFeatured)
    )
    setPromptLabelIndex(prev => (prev + 1) % promptLabels.length)
  }, [currentExamples, visibleExamples, currentFeatured, promptLabels.length])

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

      const responseMessage = await submitUserMessage(prompt, serializedConfig)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    },
    [serializedConfig, lang, setMessages, submitUserMessage]
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
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {promptLabels[promptLabelIndex]}
                </span>
                <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-200 dark:border-orange-900">
                  {promptModes[promptLabelIndex % promptModes.length]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/earnings-call"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors shadow-2xs"
                >
                  <Radio className="size-3" />
                  <span>法說會總覽</span>
                  <ArrowRight className="size-3" />
                </a>
                <button
                  type="button"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted hover:text-foreground transition-colors"
                  onClick={handleShuffle}
                  aria-label={lang === 'zh' ? '換一批提示' : 'Show new prompts'}
                >
                  <RotateCw className="size-3 text-muted-foreground" />
                  <span>{lang === 'zh' ? '換一批' : 'Shuffle'}</span>
                </button>
              </div>
            </div>
            {displayExamples.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {displayExamples.map((example, index) => {
                  const isEarningsCall = /法說|法人說明會|earnings\s*call/i.test(
                    `${example.heading} ${example.message}`
                  )
                  const isMacro =
                    !isEarningsCall &&
                    /總經|期指|非農|日曆|大宗商品|宏觀|Macro|NFP|Futures/i.test(
                      `${example.heading} ${example.message}`
                    )
                  return (
                    <div
                      key={`${lang}-${example.heading}-${index}`}
                      className="group cursor-pointer rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-2xs transition-all hover:border-foreground/30 hover:bg-muted/40"
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
                          serializedConfig
                        )
                        setMessages(currentMessages => [
                          ...currentMessages,
                          responseMessage
                        ])
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isEarningsCall ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            <Radio className="size-3" />
                            <span>法說</span>
                          </span>
                        ) : isMacro ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <Activity className="size-3" />
                            <span>總經</span>
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground border border-border/60">
                            <Sparkles className="size-3 text-amber-500" />
                            <span>研調</span>
                          </span>
                        )}
                        <h4 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {example.heading}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                        {example.subheading}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:border md:py-4">
          <PromptForm input={input} setInput={setInput} />
          <FooterText />
        </div>
      </div>
    </div>
  )
}
