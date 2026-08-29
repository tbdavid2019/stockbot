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
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
        ⚠️ 2MD 搜尋模組未能找到關於「{query}」的最新即時資訊。
      </div>
    )
  }

  return (
    <details className="group rounded-xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <svg
            className="h-4 w-4 shrink-0 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="truncate">即時研究來源</span>
          <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {results.length} 筆
          </span>
        </span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">
          <span className="group-open:hidden">展開</span>
          <span className="hidden group-open:inline">收合</span>
          <span className="ml-1 inline-block transition-transform group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>

      <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
        <p className="line-clamp-2 text-xs text-muted-foreground">{query}</p>
        <div className="space-y-2.5">
          {results.map((item, idx) => (
            <div
              key={idx}
              className="group/result rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:border-blue-500/50 hover:bg-background"
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>
                  {idx + 1}. {item.title}
                </span>
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover/result:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              </a>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
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
