'use client'

import * as React from 'react'
import { buttonVariants } from '@/components/ui/button'
import { IconSeparator, IconPlus } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { ChatHistorySheet } from '@/components/chat-history-sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { CHAT_NEW_EVENT } from '@/lib/chat-history'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useUserApiKey, openApiKeyDialog } from '@/lib/hooks/use-user-api-key'
import { ApiKeyDialog } from '@/components/api-key-dialog'
import { KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function Header() {
  const router = useRouter()
  const [lang, setLang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const [layoutMode, setLayoutMode] = useLocalStorage<'narrow' | 'wide'>(
    'stockbot_layout_mode',
    'wide'
  )
  const { config, hasCustomKey } = useUserApiKey()

  const handleNewChat = (e: React.MouseEvent) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent(CHAT_NEW_EVENT))
    router.push('/')
  }

  return (
    <>
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
          <div className="max-w-[140px] truncate text-[9px] leading-tight text-orange-600 sm:hidden">
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

          {/* BYOK 自備金鑰按鈕 */}
          <button
            type="button"
            onClick={() => openApiKeyDialog()}
            title={
              hasCustomKey
                ? `已啟用自備金鑰 (${config?.provider?.toUpperCase()})`
                : '設定自備 API 金鑰 (BYOK，伺服器不儲存)'
            }
            className={cn(
              'flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all',
              hasCustomKey
                ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                : 'border border-border/80 bg-background/80 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <KeyRound className="size-3.5" />
            {hasCustomKey ? (
              <span className="flex items-center gap-1 font-semibold">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="hidden md:inline uppercase">{config?.provider}</span>
                <span className="md:hidden">Key</span>
              </span>
            ) : (
              <span className="hidden sm:inline">自備金鑰</span>
            )}
          </button>

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
      <ApiKeyDialog />
    </>
  )
}
