'use client'

import * as React from 'react'
import type { GlobalMacroDashboardResult } from '@/lib/quant/investing-macro'

export function EconomicCalendarCard({
  data
}: {
  data: GlobalMacroDashboardResult
}) {
  const [filter, setFilter] = React.useState<'all' | 'upcoming' | 'released'>('all')

  const filteredEvents = React.useMemo(() => {
    if (filter === 'all') return data.economicEvents
    return data.economicEvents.filter(e => e.status === filter)
  }, [data.economicEvents, filter])

  const sentimentColor =
    data.sentimentSummary.bias === 'Risk-On'
      ? 'border-emerald-500/30 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : data.sentimentSummary.bias === 'Risk-Off'
      ? 'border-rose-500/30 bg-rose-50/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
      : 'border-amber-500/30 bg-amber-50/70 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'

  return (
    <section className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6 text-slate-800 dark:text-slate-100 my-3">
      {/* Header */}
      <header className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800">
              Investing.com 總經情報
            </span>
            <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-mono">
              資料時間: {data.asOfDate}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <span>全球重大總經日曆 & 跨資產風向儀</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            透過 2MD Fast Reader 即時萃取 Investing.com 總經日曆、三大期指盤前行情、美債殖利率曲線與大宗商品聯動。
          </p>
        </div>

        {/* Sentiment Box */}
        <div className={`rounded-xl border p-3 text-xs sm:text-sm shrink-0 sm:max-w-xs ${sentimentColor}`}>
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
            <span>{data.sentimentSummary.bias === 'Risk-On' ? '🟢' : data.sentimentSummary.bias === 'Risk-Off' ? '🔴' : '⚪'}</span>
            <span>{data.sentimentSummary.bias} 風向評估</span>
          </div>
          <p className="text-xs mt-1 leading-snug opacity-95">
            {data.sentimentSummary.summaryText}
          </p>
        </div>
      </header>

      {/* Cross-Asset Macro & Futures Grid */}
      <div className="mb-6">
        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1.5">
          <span>🌐 跨資產即時盤前與總經指標 (Futures & Yields)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Indices Futures */}
          {data.indicesFutures.slice(0, 4).map((f, i) => {
            const isUp = f.changePercent?.startsWith('+')
            const isDown = f.changePercent?.startsWith('-')
            return (
              <div
                key={i}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:bg-zinc-900/60 dark:border-slate-800 p-3 flex flex-col justify-between"
              >
                <div className="text-xs font-semibold text-muted-foreground truncate">
                  {f.name}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    {f.last}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isUp ? 'text-emerald-600 dark:text-emerald-400' : isDown ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                    }`}
                  >
                    {f.changePercent || '0.00%'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Key Bond Yields */}
          {data.bondYields.slice(0, 2).map((b, i) => {
            const isUp = b.changePercent?.startsWith('+')
            const isDown = b.changePercent?.startsWith('-')
            return (
              <div
                key={`bond-${i}`}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:bg-zinc-900/60 dark:border-slate-800 p-3 flex flex-col justify-between"
              >
                <div className="text-xs font-semibold text-muted-foreground truncate">
                  {b.name}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    {b.last}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isUp ? 'text-rose-600 dark:text-rose-400' : isDown ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                    }`}
                  >
                    {b.changePercent || '0.00%'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Commodities: Gold & Oil */}
          {data.commodities.slice(0, 2).map((c, i) => {
            const isUp = c.changePercent?.startsWith('+')
            const isDown = c.changePercent?.startsWith('-')
            return (
              <div
                key={`comm-${i}`}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:bg-zinc-900/60 dark:border-slate-800 p-3 flex flex-col justify-between"
              >
                <div className="text-xs font-semibold text-muted-foreground truncate">
                  {c.name}
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    {c.last}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isUp ? 'text-emerald-600 dark:text-emerald-400' : isDown ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'
                    }`}
                  >
                    {c.changePercent || '0.00%'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Economic Calendar Section */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <span>📅 即時重大總體經濟日曆 (Economic Calendar)</span>
          </h4>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-lg text-xs self-start sm:self-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-950 font-bold shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              全部 ({data.economicEvents.length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'upcoming'
                  ? 'bg-white dark:bg-zinc-950 font-bold shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              即將公布 ({data.economicEvents.filter(e => e.status === 'upcoming').length})
            </button>
            <button
              onClick={() => setFilter('released')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'released'
                  ? 'bg-white dark:bg-zinc-950 font-bold shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              已發布 ({data.economicEvents.filter(e => e.status === 'released').length})
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-muted-foreground dark:border-slate-800">
            目前無符合條件的經濟日曆數據
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-muted-foreground bg-slate-50/50 dark:bg-zinc-900/40">
                  <th className="p-2.5 pr-3 font-semibold">時間 / 倒數</th>
                  <th className="p-2.5 font-semibold">地區</th>
                  <th className="p-2.5 font-semibold">重大經濟事件</th>
                  <th className="p-2.5 font-semibold text-center">影響力</th>
                  <th className="p-2.5 font-semibold font-mono text-right">實際值 (Act.)</th>
                  <th className="p-2.5 font-semibold font-mono text-right">市場預測 (Cons.)</th>
                  <th className="p-2.5 pl-2 font-semibold font-mono text-right">前值 (Prev.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEvents.map((evt, idx) => {
                  const isHigh = evt.impact === 'high'
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="py-3 pr-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {evt.time}
                      </td>
                      <td className="py-3 p-2.5 whitespace-nowrap">
                        <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200">
                          {evt.country}
                        </span>
                      </td>
                      <td className="py-3 p-2.5 font-medium text-slate-900 dark:text-slate-100 max-w-xs sm:max-w-md">
                        {evt.url ? (
                          <a
                            href={evt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-sky-600 dark:hover:text-sky-400"
                          >
                            {evt.event}
                          </a>
                        ) : (
                          evt.event
                        )}
                      </td>
                      <td className="py-3 p-2.5 text-center whitespace-nowrap">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            isHigh
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          }`}
                        >
                          {isHigh ? '★★★ 高' : '★★ 中'}
                        </span>
                      </td>
                      <td className="py-3 p-2.5 font-mono font-bold text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {evt.actual || '—'}
                      </td>
                      <td className="py-3 p-2.5 font-mono text-right text-muted-foreground whitespace-nowrap">
                        {evt.forecast || '—'}
                      </td>
                      <td className="py-3 pl-2 font-mono text-right text-muted-foreground whitespace-nowrap">
                        {evt.previous || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer / Attribution */}
      <footer className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>資料來源：Investing.com 全球財經日曆 (由 2MD 串流萃取)</span>
        <a
          href="https://www.investing.com/economic-calendar/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:underline dark:text-sky-400 flex items-center gap-1"
        >
          查看 Investing.com 完整日曆 ↗
        </a>
      </footer>
    </section>
  )
}
