import type { InstitutionalFlowResult } from '@/lib/quant/institutional'

interface Props {
  symbol: string
  data: InstitutionalFlowResult
}

const formatLots = (val?: number) => {
  if (val === undefined || Number.isNaN(val)) return '—'
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toLocaleString()} 張`
}

const getVolumeColor = (val?: number) => {
  if (!val || val === 0) return 'text-muted-foreground'
  return val > 0
    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
    : 'text-rose-600 dark:text-rose-400 font-semibold'
}

export function InstitutionalFlowCard({ symbol, data }: Props) {
  const signalSentimentColors = {
    bullish:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    bearish:
      'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    neutral:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
  }

  const badgeColor = signalSentimentColors[data.signals.sentiment] || signalSentimentColors.neutral

  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {data.market === 'TPEX' ? 'TPEX 櫃買官方資料' : 'TWSE 證交所官方資料'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              基準交易日：{data.latestDate}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-bold">
            {data.companyName} ({data.symbol}) 三大法人籌碼
          </h3>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeColor}`}
          >
            {data.signals.tag}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            今日合計：
            <span className={getVolumeColor(data.today.totalNet)}>
              {formatLots(data.today.totalNet)}
            </span>
          </p>
        </div>
      </header>

      {/* 3 Core Pillars */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Foreign */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">🏢 外資及陸資</p>
            {data.streaks.foreign.days > 0 && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  data.streaks.foreign.type === 'buy'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                連{data.streaks.foreign.type === 'buy' ? '買' : '賣'}{' '}
                {data.streaks.foreign.days} 日
              </span>
            )}
          </div>
          <p className={`mt-1 font-mono text-base ${getVolumeColor(data.today.foreignNet)}`}>
            {formatLots(data.today.foreignNet)}
          </p>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>5 日累計:</span>
            <span className={getVolumeColor(data.fiveDayCumulative.foreignNet)}>
              {formatLots(data.fiveDayCumulative.foreignNet)}
            </span>
          </div>
          {data.ownership?.foreignPercent !== undefined && (
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>外資持股比率:</span>
              <span className="font-semibold text-foreground">
                {data.ownership.foreignPercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        {/* Investment Trust */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">🏦 國內投信</p>
            {data.streaks.trust.days > 0 && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  data.streaks.trust.type === 'buy'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                連{data.streaks.trust.type === 'buy' ? '買' : '賣'}{' '}
                {data.streaks.trust.days} 日
              </span>
            )}
          </div>
          <p className={`mt-1 font-mono text-base ${getVolumeColor(data.today.trustNet)}`}>
            {formatLots(data.today.trustNet)}
          </p>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>5 日累計:</span>
            <span className={getVolumeColor(data.fiveDayCumulative.trustNet)}>
              {formatLots(data.fiveDayCumulative.trustNet)}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>作帳/認養偏向:</span>
            <span className="font-semibold text-foreground">
              {data.fiveDayCumulative.trustNet > 0 ? '偏多鎖碼' : '調節結帳'}
            </span>
          </div>
        </div>

        {/* Dealers */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">💼 自營商</p>
            <span className="text-[10px] text-muted-foreground">自行 + 避險</span>
          </div>
          <p className={`mt-1 font-mono text-base ${getVolumeColor(data.today.dealerNet)}`}>
            {formatLots(data.today.dealerNet)}
          </p>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>5 日累計:</span>
            <span className={getVolumeColor(data.fiveDayCumulative.dealerNet)}>
              {formatLots(data.fiveDayCumulative.dealerNet)}
            </span>
          </div>
          {data.history[0]?.dealerProprietary !== undefined && (
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>自行買賣 / 避險:</span>
              <span className="font-mono text-foreground">
                {data.history[0].dealerProprietary} / {data.history[0].dealerHedge} 張
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Signal Briefing */}
      <div className="mt-3.5 rounded-xl border border-blue-100/80 bg-blue-50/40 p-3 text-xs leading-relaxed text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
        <span className="font-bold">💡 籌碼解讀：</span>
        {data.signals.description}
      </div>

      {/* Historical Breakdown Table */}
      {data.history.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            近 {Math.min(5, data.history.length)} 個交易日三大法人買賣超明細 (張)
          </p>
          <table className="w-full min-w-[480px] border-collapse text-right text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-muted-foreground dark:border-slate-800">
                <th className="pb-1.5 text-left font-medium">交易日期</th>
                <th className="pb-1.5 font-medium">外資買賣超</th>
                <th className="pb-1.5 font-medium">投信買賣超</th>
                <th className="pb-1.5 font-medium">自營商買賣超</th>
                <th className="pb-1.5 font-medium">三大法人合計</th>
              </tr>
            </thead>
            <tbody>
              {data.history.slice(0, 5).map((row, idx) => (
                <tr
                  key={row.date}
                  className={`border-b border-slate-100 font-mono dark:border-slate-900 ${
                    idx === 0 ? 'bg-slate-50/50 font-semibold dark:bg-zinc-900/40' : ''
                  }`}
                >
                  <td className="py-2 text-left font-sans text-muted-foreground">
                    {row.date} {idx === 0 ? '(最新)' : ''}
                  </td>
                  <td className={`py-2 ${getVolumeColor(row.foreignNet)}`}>
                    {formatLots(row.foreignNet)}
                  </td>
                  <td className={`py-2 ${getVolumeColor(row.trustNet)}`}>
                    {formatLots(row.trustNet)}
                  </td>
                  <td className={`py-2 ${getVolumeColor(row.dealerNet)}`}>
                    {formatLots(row.dealerNet)}
                  </td>
                  <td className={`py-2 font-bold ${getVolumeColor(row.totalNet)}`}>
                    {formatLots(row.totalNet)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
