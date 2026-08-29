'use client'

import React, { useEffect, useState } from 'react'
import { formatStockSymbol } from '@/lib/utils'

interface NewsItem {
  title: string
  url: string
  description: string
  publisher?: string
}

interface NativeNewsCardProps {
  symbol: string
  initialNews?: NewsItem[]
}

export function NativeStockNewsCard({ symbol, initialNews }: NativeNewsCardProps) {
  const [news, setNews] = useState<NewsItem[]>(initialNews || [])
  const [loading, setLoading] = useState(!initialNews || initialNews.length === 0)

  const formattedSymbol = formatStockSymbol(symbol)

  useEffect(() => {
    let isMounted = true
    if (initialNews && initialNews.length > 0) {
      setNews(initialNews)
      setLoading(false)
      return
    }

    async function loadNews() {
      setLoading(true)
      try {
        const query = `${symbol} 最新新聞 財報 重大動態`
        // 透過 2MD 搜尋端點獲取最新新聞
        const res = await fetch(`https://2md.aiurl.tw/search?q=${encodeURIComponent(query)}&limit=5`, {
          headers: { Accept: 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data?.results && Array.isArray(data.results)) {
            setNews(
              data.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                description: r.description,
                publisher: r.domain || r.publisher || '即時財經新聞'
              }))
            )
          }
        }
      } catch (err) {
        console.warn('[NativeStockNewsCard] Fetch error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadNews()
    return () => {
      isMounted = false
    }
  }, [symbol, initialNews])

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-zinc-950 dark:to-zinc-900/50 p-4 sm:p-5 shadow-xs">
      {/* 標題欄 */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            📰
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {formattedSymbol || symbol} 即時財經新聞與重大動態
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                即時更新
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              由 2MD 全網情報大腦實時聚合主流財經媒體與最新快訊
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-2.5">
          <div className="size-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          <span className="text-xs text-muted-foreground">正在檢索最新突發新聞與法說會指引...</span>
        </div>
      ) : news.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-slate-800 text-xs text-muted-foreground text-center">
          目前暫無近 24 小時重大異常快訊，下方已為您整合基本面與市場情報。
        </div>
      ) : (
        <div className="space-y-2.5">
          {news.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-zinc-900/70 p-3 transition hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 line-clamp-1">
                  {item.title}
                </h4>
                {item.publisher && (
                  <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {item.publisher}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default NativeStockNewsCard
