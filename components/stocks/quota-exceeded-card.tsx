'use client'

import * as React from 'react'
import { openApiKeyDialog } from '@/lib/hooks/use-user-api-key'
import { KeyRound, ShieldAlert, Sparkles, ServerOff } from 'lucide-react'

interface QuotaExceededCardProps {
  errorDetails?: string
  isUnauthorized?: boolean
}

export function QuotaExceededCard({
  errorDetails,
  isUnauthorized = false
}: QuotaExceededCardProps) {
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-amber-950/20 p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-start gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30">
          {isUnauthorized ? (
            <ShieldAlert className="size-5" />
          ) : (
            <ServerOff className="size-5" />
          )}
        </div>

        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {isUnauthorized
                ? '金鑰驗證未通過或授權失效'
                : '免費 API 額度已達上限 (Quota Exceeded)'}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
              <Sparkles className="size-3.5" />
              BYOK 模式已就緒
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {isUnauthorized
              ? '您目前設定的自訂金鑰可能已過期或權限不足。請檢查您的金鑰設定或重新輸入。'
              : '伺服器端提供的共用免費額度目前已暫時耗盡。您可以填入自己的 OpenAI、Groq 或 Gemini API 金鑰繼續使用。'}
          </p>

          {errorDetails && (
            <div className="rounded-lg bg-muted/60 p-2.5 font-mono text-xs text-muted-foreground break-all leading-normal">
              {errorDetails}
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openApiKeyDialog()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow transition-all hover:from-amber-600 hover:to-amber-700 hover:shadow-md active:scale-[0.98]"
            >
              <KeyRound className="size-4" />
              設定 / 填入自備 API 金鑰
            </button>

            <span className="text-xs text-muted-foreground">
              🔒 零伺服器儲存 · 僅存於本機瀏覽器
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
