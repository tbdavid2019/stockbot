'use client'

import React from 'react'
import { KeyRound } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ExternalLink } from '@/components/external-link'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'

import { useLocalStorage } from '@/lib/hooks/use-local-storage'

export function FooterText({ className, ...props }: React.ComponentProps<'div'>) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const { openDialog, hasCustomKey, config } = useUserApiKey()

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-2 text-center text-xs sm:text-sm leading-normal text-muted-foreground',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        <span>{lang === 'zh' ? '技術提供' : 'Powered by'}</span>
        <ExternalLink href="https://david888.com">david888.com</ExternalLink>
      </div>

      <span className="text-muted-foreground/40 hidden sm:inline">·</span>

      {/* 自備金鑰按鈕 - 與技術提供放在同一行 */}
      <button
        type="button"
        onClick={() => openDialog()}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all cursor-pointer shadow-2xs',
          hasCustomKey
            ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
            : 'border border-border/80 bg-background/90 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-orange-400'
        )}
        title={
          lang === 'zh'
            ? '自備 API Key 暢享無限制分析 · 伺服器零留存保證 (BYOK)'
            : 'Bring Your Own Key (BYOK) · Zero server retention'
        }
      >
        <KeyRound className="size-3.5 text-orange-500 dark:text-orange-400" />
        {hasCustomKey ? (
          <span className="flex items-center gap-1 font-semibold">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500"></span>
            </span>
            <span>
              {lang === 'zh' ? '自備金鑰' : 'BYOK'} ({config?.provider?.toUpperCase()})
            </span>
          </span>
        ) : (
          <span>{lang === 'zh' ? '自備金鑰 (BYOK)' : 'Custom API Key (BYOK)'}</span>
        )}
      </button>
    </div>
  )
}
