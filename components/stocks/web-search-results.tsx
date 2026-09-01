'use client'

import React from 'react'
import type { TwoMDResultItem } from '@/lib/2md'

export function WebSearchResults({
  query,
  results
}: {
  query: string
  results: TwoMDResultItem[]
}) {
  if (!results || results.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm sm:text-base text-muted-foreground shadow-sm">
        ⚠️ 2MD 搜尋模組未能找到關於「{query}」的最新即時資訊。
      </div>
    )
  }

  return (
    <details className="group rounded-2xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 text-base font-bold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <svg
            className="size-5 shrink-0 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="truncate">即時連網研究來源</span>
          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {results.length} 筆
          </span>
        </span>
        <span className="shrink-0 text-xs sm:text-sm font-normal text-muted-foreground">
          <span className="group-open:hidden">展開來源</span>
          <span className="hidden group-open:inline">收合來源</span>
          <span className="ml-1 inline-block transition-transform group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>

      <div className="space-y-3 border-t border-border px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <p className="line-clamp-2 text-xs sm:text-sm text-muted-foreground font-mono">搜尋關鍵字：{query}</p>
        <div className="space-y-3">
          {results.map((item, idx) => (
            <div
              key={idx}
              className="group/result rounded-xl border border-border/60 bg-background/50 p-3.5 sm:p-4 transition-colors hover:border-blue-500/50 hover:bg-background"
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-2 text-sm sm:text-base font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>
                  {idx + 1}. {item.title}
                </span>
                <svg
                  className="mt-1 size-4 shrink-0 opacity-70 transition-opacity group-hover/result:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              </a>
              {item.description && (
                <p className="mt-1.5 line-clamp-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </details>
  )
}
