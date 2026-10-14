'use client'

import * as React from 'react'
import { StockbotLogo } from '@/components/stockbot-logo'
import { buttonVariants } from '@/components/ui/button'
import { IconSeparator } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { ChatHistorySheet } from '@/components/chat-history-sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { CHAT_NEW_EVENT } from '@/lib/chat-history'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { ApiKeyDialog } from '@/components/api-key-dialog'
import { useRouter } from 'next/navigation'
import { Plus, Radio, Maximize2, Minimize2 } from 'lucide-react'

export function Header() {
  const router = useRouter()
  const [lang, setLang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const [layoutMode, setLayoutMode] = useLocalStorage<'narrow' | 'wide'>(
    'stockbot_layout_mode',
    'wide'
  )

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent(CHAT_NEW_EVENT))
    window.location.href = '/'
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex h-12 min-w-0 items-center justify-between gap-2 border-b border-border/80 bg-background/85 px-3 backdrop-blur-xl sm:h-14 sm:px-5">
        <div className="flex min-w-0 items-center space-x-1.5 font-semibold sm:space-x-2">
          {/* Logo */}
          <a
            href="/"
            onClick={handleNewChat}
            className="flex items-center gap-2 text-sm font-bold text-foreground transition-opacity hover:opacity-85 sm:text-base"
          >
            <StockbotLogo className="size-9 shrink-0 rounded-md sm:size-10" />
            <span className="hidden sm:inline tracking-tight font-extrabold">888 StockBot</span>
            <span className="sm:hidden tracking-tight font-extrabold">888</span>
          </a>

          <IconSeparator className="hidden size-5 text-muted-foreground/30 sm:block" />

          {/* Start New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs sm:text-sm font-semibold text-orange-600 hover:bg-orange-500/20 dark:text-orange-400 transition-colors shadow-2xs"
            title={lang === 'zh' ? '開啟新對話' : 'Start New Chat'}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">{lang === 'zh' ? '新對話' : 'New Chat'}</span>
            <span className="sm:hidden">{lang === 'zh' ? '新' : 'New'}</span>
          </button>

          <IconSeparator className="hidden size-5 text-muted-foreground/30 sm:block" />

          {/* Chat History Drawer Trigger */}
          <ChatHistorySheet />

          <IconSeparator className="hidden size-5 text-muted-foreground/30 sm:block" />

          {/* Dedicated 法說會總覽 Navigation Link */}
          <a
            href="/earnings-call"
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200/90 bg-indigo-50/80 px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80 transition-all shadow-2xs"
            title={lang === 'zh' ? '法人說明會總覽 (Earnings Calls) · MOPS / TWSE / 美股即時日程與簡報' : 'Earnings Calls & Webcasts · MOPS / TWSE / US Corporate Earnings'}
          >
            <Radio className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline font-semibold">{lang === 'zh' ? '法說會總覽' : 'Earnings Calls'}</span>
            <span className="sm:hidden font-semibold">{lang === 'zh' ? '法說會' : 'Calls'}</span>
            <span className="hidden md:inline-flex items-center rounded bg-indigo-200/70 px-1 py-0.5 text-xs font-mono text-indigo-900 dark:bg-indigo-900/70 dark:text-indigo-200 font-bold">
              MOPS
            </span>
          </a>
        </div>

        <div className="flex min-w-0 shrink items-center gap-1.5 text-sm sm:gap-2">
          <div className="hidden text-sm leading-snug text-orange-600 sm:block font-medium">
            {lang === 'en'
              ? 'For reference only · Investment advice: '
              : '本服務僅供參考；投資建議請至 '}
            <a
              href="https://t.me/oli_billion_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-orange-700"
            >
              oli-™股靈精怪 Stock
            </a>
          </div>
          <div className="max-w-[180px] truncate text-xs leading-tight text-orange-600 sm:hidden font-medium">
            {lang === 'en'
              ? 'Reference only · Advice: '
              : '僅供參考；建議：'}
            <a
              href="https://t.me/oli_billion_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              oli-™股靈精怪
            </a>
          </div>

          <div className="inline-flex shrink-0 rounded-md border bg-muted/60 p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              className={`rounded px-1.5 py-1 font-medium transition-all sm:px-2 ${
                lang === 'zh'
                  ? 'bg-background font-semibold text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setLang('zh')}
              aria-pressed={lang === 'zh'}
            >
              繁中
            </button>
            <button
              type="button"
              className={`rounded px-1.5 py-1 font-medium transition-all sm:px-2 ${
                lang === 'en'
                  ? 'bg-background font-semibold text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border/80 bg-background px-2 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-muted shadow-2xs"
            aria-pressed={layoutMode === 'wide'}
            title={
              lang === 'zh'
                ? layoutMode === 'wide'
                  ? '切換窄版'
                  : '切換寬版'
                : layoutMode === 'wide'
                  ? 'Switch to Narrow View'
                  : 'Switch to Wide View'
            }
            onClick={() => {
              const nextMode = layoutMode === 'wide' ? 'narrow' : 'wide'
              setLayoutMode(nextMode)
              window.dispatchEvent(new Event('stockbot-layout-change'))
            }}
          >
            {layoutMode === 'wide' ? (
              <Minimize2 className="size-3.5 text-muted-foreground" />
            ) : (
              <Maximize2 className="size-3.5 text-muted-foreground" />
            )}
            <span className="hidden sm:inline">
              {lang === 'zh'
                ? layoutMode === 'wide'
                  ? '窄版'
                  : '寬版'
                : layoutMode === 'wide'
                  ? 'Narrow'
                  : 'Wide'}
            </span>
          </button>
          <ThemeToggle />
        </div>
      </header>
      <ApiKeyDialog />
    </>
  )
}
