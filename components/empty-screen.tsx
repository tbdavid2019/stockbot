'use client'

import * as React from 'react'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'
import Link from 'next/link'

import {
  TrendingUp,
  Radio,
  Calendar,
  BarChart3,
  ArrowRight,
  MessageSquare,
  Activity,
  Sparkles,
  RotateCw
} from 'lucide-react'

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

export function EmptyScreen({ wide = false }: { wide?: boolean }) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const { submitUserMessage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
  const { serializedConfig } = useUserApiKey()

  const [cachedPromptsZh, setCachedPromptsZh] =
    React.useState<ExampleMessage[]>(DEFAULT_PROMPTS_ZH)
  const [cachedPromptsEn, setCachedPromptsEn] =
    React.useState<ExampleMessage[]>(DEFAULT_PROMPTS_EN)
  const [featuredZh, setFeaturedZh] =
    React.useState<ExampleMessage[]>(DEFAULT_FEATURED_ZH)
  const [featuredEn, setFeaturedEn] =
    React.useState<ExampleMessage[]>(DEFAULT_FEATURED_EN)

  // Stable deterministic initial batch based on lang; NEVER flicker or swap automatically on mount
  const [visibleExamples, setVisibleExamples] = React.useState<ExampleMessage[]>(() =>
    lang === 'zh' ? DEFAULT_PROMPTS_ZH.slice(0, 6) : DEFAULT_PROMPTS_EN.slice(0, 6)
  )
  const [promptLabelIndex, setPromptLabelIndex] = React.useState(0)
  const prevLangRef = React.useRef(lang)

  // Background fetch only updates the cached pool for the NEXT shuffle; does NOT replace current visible cards!
  React.useEffect(() => {
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

  // Only switch visible prompts when the user explicitly switches language
  React.useEffect(() => {
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

  const handleShuffle = React.useCallback(() => {
    setVisibleExamples(
      shufflePrompts(currentExamples, visibleExamples, currentFeatured)
    )
    setPromptLabelIndex(prev => (prev + 1) % promptLabels.length)
  }, [currentExamples, visibleExamples, currentFeatured, promptLabels.length])

  const handlePromptClick = async (prompt: string) => {
    try {
      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          display: <UserMessage>{prompt}</UserMessage>
        }
      ])

      const responseMessage = await submitUserMessage(prompt, serializedConfig)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    } catch (err) {
      console.error('Failed to submit message:', err)
    }
  }

  return (
    <div
      className={`mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 space-y-6 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}
    >
      {/* Editorial Header - Pure and unnested, eliminating patchwork and card-in-card clutter */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground">
            <TrendingUp className="size-3.5 text-[#A9471D] dark:text-[#FFB010]" />
            <span>888 StockBot · {lang === 'zh' ? 'AI 智慧投資情報' : 'AI Market Intelligence'}</span>
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Live v4.5
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {lang === 'zh'
            ? '深入剖析台美股 · 即時連網情報與法人展望'
            : 'Institutional-Grade Market Intelligence & Analysis'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {lang === 'zh'
            ? '整合公開資訊觀測站 (MOPS) 重訊、TWSE/TPEX 官方 Webcast、美股 Earnings Call、TradingView 即時圖表、Yahoo Finance 原生財報與 13 位投資大師多空量化模型。'
            : 'Integrating MOPS earnings calls, TWSE/TPEX official webcasts, US corporate earnings, interactive TradingView charts, Yahoo Fundamentals, and multi-analyst consensus models.'}
        </p>
      </div>

      {/* Primary Feature Bar - High visibility for 法說會總覽 and quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Feature 1: 法說會總覽 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-foreground/30 hover:shadow-sm transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground border border-border">
                  <Radio className="size-4" />
                </span>
                <span>{lang === 'zh' ? '法人說明會總覽' : 'Earnings Calls'}</span>
              </span>
              <span className="rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground border border-border">
                MOPS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
              {lang === 'zh'
                ? '台美股法說會日程、官方影音直播、簡報 PDF 下載與 2MD AI 秒級指引萃取。'
                : 'Corporate earnings call dates, live webcasts, PDF decks & AI guidance extraction.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
            <Link
              href="/earnings-call"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
            >
              <span>{lang === 'zh' ? '開啟法說會總覽頁' : 'Open Earnings Dashboard'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '近期台股與美股有哪些法人說明會？'
                    : 'Show me upcoming corporate earnings calls and investor conferences'
                )
              }
              className="inline-flex items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline truncate cursor-pointer"
            >
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">{lang === 'zh' ? '在對話中列出近期法說會' : 'List recent calls in chat'}</span>
            </button>
          </div>
        </div>

        {/* Feature 2: 全球重大總經日曆 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-foreground/30 hover:shadow-sm transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-[#17324D] dark:text-sky-300 border border-sky-500/20">
                  <Calendar className="size-4" />
                </span>
                <span>{lang === 'zh' ? '全球重大總經日曆' : 'Macro Calendar'}</span>
              </span>
              <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-[#17324D] dark:text-sky-300 border border-sky-500/20">
                Investing
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
              {lang === 'zh'
                ? '即時追蹤美股盤前期指、恐慌指數 VIX、非農 NFP、CPI 與各國央行利率決策。'
                : 'Live US pre-market futures, VIX index, NFP, CPI & central bank interest decisions.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '今晚有什麼重大總經數據？'
                    : 'What are the key global economic events and data releases tonight?'
                )
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors cursor-pointer"
            >
              <span>{lang === 'zh' ? '查詢今晚總經數據' : "Check Tonight's Events"}</span>
              <ArrowRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '美股盤前期貨與經濟日曆'
                    : 'Show me US pre-market futures and economic calendar'
                )
              }
              className="inline-flex items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline truncate cursor-pointer"
            >
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">{lang === 'zh' ? '美股盤前期指與風向' : 'US pre-market futures'}</span>
            </button>
          </div>
        </div>

        {/* Feature 3: 原生財報與大師分析 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-foreground/30 hover:shadow-sm transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <BarChart3 className="size-4" />
                </span>
                <span>{lang === 'zh' ? '原生財報與大師觀點' : 'Financials & Masters'}</span>
              </span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                2MD AI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
              {lang === 'zh'
                ? '查詢台美股營收、毛利、本益比與估值，或點擊下方附件按鈕上傳任意財報 PDF 秒級剖析。'
                : 'Yahoo Fundamentals, balance sheets, DCF valuation and multi-analyst consensus.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '請整理台積電 (2330) 最新財務數據與估值'
                    : 'Summarize the latest financials and valuation for TSMC (2330)'
                )
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors cursor-pointer"
            >
              <span>{lang === 'zh' ? '台積電最新財務數據' : 'TSMC Financials'}</span>
              <ArrowRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '請用多位投資大師分析股票代號 AAPL（Apple）的投資價值'
                    : 'Give me a multi-analyst investment view of ticker AAPL (Apple)'
                )
              }
              className="inline-flex items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline truncate cursor-pointer"
            >
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">{lang === 'zh' ? 'Apple 13 位大師圓桌評價' : 'Apple multi-analyst evaluation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Suggestions Section: Clean, flowable, zero-overlap */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {promptLabels[promptLabelIndex]}
            </span>
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-[#A9471D] dark:text-[#FFB010] border border-border">
              {promptModes[promptLabelIndex % promptModes.length]}
            </span>
          </div>

          <button
            type="button"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors cursor-pointer"
            onClick={handleShuffle}
            aria-label={lang === 'zh' ? '換一批提示' : 'Show new prompts'}
          >
            <RotateCw className="size-3 text-muted-foreground" />
            <span>{lang === 'zh' ? '換一批' : 'Shuffle'}</span>
          </button>
        </div>

        {/* 6 Suggestion Cards in Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
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
                role="button"
                tabIndex={0}
                className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-2xs transition-all hover:border-foreground/30 hover:bg-muted/40 cursor-pointer text-left"
                onClick={() => handlePromptClick(example.message)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    void handlePromptClick(example.message)
                  }
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {isEarningsCall ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground border border-border">
                        <Radio className="size-3" />
                        <span>{lang === 'zh' ? '法說' : 'Earnings'}</span>
                      </span>
                    ) : isMacro ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-[#17324D] dark:text-sky-300 border border-sky-500/20">
                        <Activity className="size-3" />
                        <span>{lang === 'zh' ? '總經' : 'Macro'}</span>
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground border border-border/60">
                        <Sparkles className="size-3 text-amber-500" />
                        <span>{lang === 'zh' ? '研調' : 'Research'}</span>
                      </span>
                    )}
                    <h4 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-[#A9471D] dark:group-hover:text-[#FFB010] transition-colors truncate">
                      {example.heading}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {example.subheading}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
