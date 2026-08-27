'use client'

import React from 'react'
import { TwoMDResultItem } from '@/lib/2md'

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
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
        <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span>🌐 2MD 即時連網搜尋結果：{query}</span>
      </div>
      <div className="space-y-2.5">
        {results.map((item, idx) => (
          <div
            key={idx}
            className="group rounded-lg border border-border/50 bg-background/50 p-3 transition-colors hover:border-blue-500/50 hover:bg-background"
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
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
            {item.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
