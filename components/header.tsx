'use client'

import * as React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { IconSeparator, IconPlus } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { ChatHistorySheet } from '@/components/chat-history-sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { CHAT_NEW_EVENT } from '@/lib/chat-history'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useRouter } from 'next/navigation'

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
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 flex h-12 min-w-0 items-center justify-between gap-2 border-b bg-gradient-to-b from-background/10 via-background/50 to-background/80 px-3 backdrop-blur-xl sm:h-14 sm:px-5">
      <div className="flex min-w-0 items-center space-x-1.5 font-semibold sm:space-x-2">
        {/* Logo */}
        <a
          href="/"
          onClick={handleNewChat}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-900 transition-opacity hover:opacity-80 dark:text-slate-100 sm:text-base"
        >
          <span className="text-lg sm:text-xl">📈</span>
          <span className="hidden sm:inline">888 StockBot</span>
          <span className="sm:hidden">888</span>
        </a>

        <IconSeparator className="hidden size-5 text-muted-foreground/30 sm:block" />

        {/* Start New Chat Button */}
        <button
          type="button"
          onClick={handleNewChat}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'flex items-center gap-1 text-sm font-semibold'
          )}
          style={{ borderRadius: 6, color: '#F55036', padding: '4px 8px' }}
        >
          <IconPlus className="size-3.5" />
          <span className="hidden sm:inline">Start New Chat</span>
          <span className="sm:hidden">New</span>
        </button>

        <IconSeparator className="hidden size-5 text-muted-foreground/30 sm:block" />

        {/* Chat History Drawer Trigger */}
        <ChatHistorySheet />
      </div>

      <div className="flex min-w-0 shrink items-center gap-1.5 text-sm sm:gap-2">
        <div className="hidden text-sm leading-snug text-orange-600 sm:block">
          本機器人沒有提供投資建議，若需要投資建議請用{' '}
          <a
            href="https://t.me/oli_billion_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-orange-700"
          >
            https://t.me/oli_billion_bot
          </a>
        </div>
        <div className="whitespace-nowrap text-[9px] leading-tight text-orange-600 sm:hidden">
          非投資建議 ·{' '}
          <a
            href="https://t.me/oli_billion_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Telegram
          </a>
        </div>
        <div className="inline-flex shrink-0 rounded-md border bg-muted/60 p-0.5 text-xs shadow-sm">
          <button
            type="button"
            className={`rounded px-1.5 py-1 font-medium transition-all sm:px-2 ${
              lang === 'zh'
                ? 'bg-background font-semibold text-foreground shadow-sm'
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
                ? 'bg-background font-semibold text-foreground shadow-sm'
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
          className="flex h-7 shrink-0 items-center gap-1 rounded-md px-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2"
          aria-pressed={layoutMode === 'wide'}
          title={layoutMode === 'wide' ? '切換窄版' : '切換寬版'}
          onClick={() => {
            const nextMode = layoutMode === 'wide' ? 'narrow' : 'wide'
            setLayoutMode(nextMode)
            window.dispatchEvent(new Event('stockbot-layout-change'))
          }}
        >
          <span aria-hidden="true">↔</span>
          <span className="hidden sm:inline">
            {layoutMode === 'wide' ? '窄版' : '寬版'}
          </span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
