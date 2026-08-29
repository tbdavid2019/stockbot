import * as React from 'react'

import { buttonVariants } from '@/components/ui/button'
import { IconGroq, IconSeparator, IconVercel } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { Session } from '@/lib/types'

async function UserOrLogin() {
  return (
    <div className="flex min-w-0 items-center space-x-2 font-semibold">
      <a
        href="/new"
        className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity"
      >
        <span className="text-xl">📈</span>
        <span className="hidden sm:inline">888 StockBot</span>
        <span className="sm:hidden">888</span>
      </a>
      <IconSeparator className="hidden size-6 text-muted-foreground/50 sm:block" />
      <a
        href="/new"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: 'ghost' }))}
        style={{ borderRadius: 0, color: '#F55036', padding: '4px' }}
      >
        <span className="hidden text-xs font-semibold sm:flex">
          Start New Chat
        </span>
        <span className="flex text-xs font-semibold sm:hidden">New Chat</span>
      </a>
    </div>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-16 min-w-0 items-center justify-between gap-2 border-b bg-gradient-to-b from-background/10 via-background/50 to-background/80 px-2 backdrop-blur-xl sm:px-4">
      <div className="min-w-0 shrink">
        <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
          <UserOrLogin />
        </React.Suspense>
      </div>
      <div className="min-w-0 shrink text-right text-xs">
        <div className="hidden text-[10px] leading-snug text-orange-600 sm:block">
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
      </div>
    </header>
  )
}
