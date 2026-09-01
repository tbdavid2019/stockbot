import type { EarningsIntelligence } from '@/lib/financial-fundamentals'

const n = (value?: number, digits = 2) =>
  value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits)
const pct = (value?: number) =>
  value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`

export function EarningsBriefingCard({ data }: { data: EarningsIntelligence }) {
  const quartersWithEstimate = data.history.filter(
    item => item.epsActual !== undefined && item.epsEstimate !== undefined
  )
  const beats = quartersWithEstimate.filter(
    item => item.epsActual! > item.epsEstimate!
  ).length
  const quartersWithSurprise = data.history.filter(
    item => item.surprisePercent !== undefined && Number.isFinite(item.surprisePercent)
  )
  const averageSurprise = quartersWithSurprise.length
    ? quartersWithSurprise.reduce((sum, item) => sum + item.surprisePercent!, 0) /
      quartersWithSurprise.length
    : undefined
  const targetUpside =
    data.priceTarget.currentPrice && data.priceTarget.mean
      ? (data.priceTarget.mean / data.priceTarget.currentPrice - 1) * 100
      : undefined

  const hasPriceTarget =
    data.priceTarget.currentPrice !== undefined ||
    data.priceTarget.mean !== undefined ||
    data.priceTarget.median !== undefined ||
    data.priceTarget.low !== undefined ||
    data.priceTarget.high !== undefined

  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Earnings Intelligence 財報情報
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{data.symbol} 財報前瞻與共識</h3>
        </div>
        <div className="text-right">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">預計公布日期</p>
          <p className="font-mono text-lg sm:text-xl font-bold">{data.earningsDate || '待確認'}</p>
          <p className="text-xs text-muted-foreground">
            {data.session === 'unknown'
              ? '時段待確認'
              : data.session === 'before-open'
                ? '盤前公布'
                : '盤後公布'}
          </p>
        </div>
      </header>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="mb-2.5 font-bold text-foreground">分析師共識區間</p>
          <div className="grid grid-cols-2 gap-2">
            <span>EPS 平均: <strong className="font-mono text-foreground">{n(data.eps.average)}</strong></span>
            <span>分析師家數: <strong className="font-mono text-foreground">{n(data.eps.analystCount, 0)}</strong></span>
            <span>
              EPS 低 / 高: <strong className="font-mono text-foreground">{n(data.eps.low)} / {n(data.eps.high)}</strong>
            </span>
            <span>營收平均: <strong className="font-mono text-foreground">{n(data.revenue.average, 0)}</strong></span>
            <span>
              營收低 / 高: <strong className="font-mono text-foreground">{n(data.revenue.low, 0)} / {n(data.revenue.high, 0)}</strong>
            </span>
            <span>營收 YoY: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{pct(data.revenue.yearOverYearGrowth)}</strong></span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="mb-2.5 font-bold text-foreground">法人機構目標價</p>
          {hasPriceTarget ? (
            <div className="grid grid-cols-2 gap-2">
              <span>現價: <strong className="font-mono text-foreground">{n(data.priceTarget.currentPrice)}</strong></span>
              <span>中位數: <strong className="font-mono text-foreground">{n(data.priceTarget.median)}</strong></span>
              <span>
                低 / 高: <strong className="font-mono text-foreground">{n(data.priceTarget.low)} / {n(data.priceTarget.high)}</strong>
              </span>
              <span>平均潛在空間: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{pct(targetUpside)}</strong></span>
            </div>
          ) : (
            <div className="py-2 text-xs sm:text-sm text-muted-foreground">
              待分析師發布最新目標價與潛在評等
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <p className="mb-2.5 text-xs sm:text-sm font-bold text-foreground">過去四季 EPS 實績對照</p>
        <table className="w-full min-w-[480px] text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left font-semibold text-muted-foreground dark:border-slate-800">
              <th className="pb-2">季度</th>
              <th className="pb-2">市場預估</th>
              <th className="pb-2">實際公布</th>
              <th className="pb-2">Surprise 驚喜度</th>
              <th className="pb-2">結果判讀</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map(item => (
              <tr key={item.date} className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-2.5">{item.date}</td>
                <td className="py-2.5 font-mono">{n(item.epsEstimate)}</td>
                <td className="py-2.5 font-mono font-semibold">{n(item.epsActual)}</td>
                <td className={`py-2.5 font-mono font-semibold ${(item.surprisePercent ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{pct(item.surprisePercent)}</td>
                <td className="py-2.5">
                  {item.epsActual === undefined ||
                  item.epsEstimate === undefined ? (
                    '—'
                  ) : item.epsActual > item.epsEstimate ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Beat 超預期
                    </span>
                  ) : (
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      Miss 遜預期
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
          {quartersWithEstimate.length > 0
            ? `Beat 達成率 ${beats}/${quartersWithEstimate.length} · 平均 surprise ${pct(averageSurprise)}`
            : data.history.length > 0
              ? '歷史實際 EPS 已列出；共識預估與 Surprise 待新財報季公布前更新'
              : '暫無歷史季度 EPS 數據'}
        </p>
      </div>
    </section>
  )
}
