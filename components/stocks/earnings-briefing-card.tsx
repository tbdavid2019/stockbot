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
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
            Earnings Intelligence
          </p>
          <h3 className="text-lg font-bold">{data.symbol} 財報前瞻</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">預計公布</p>
          <p className="font-semibold">{data.earningsDate || '待確認'}</p>
          <p className="text-[11px] text-muted-foreground">
            {data.session === 'unknown'
              ? '時段待確認'
              : data.session === 'before-open'
                ? '盤前'
                : '盤後'}
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="mb-2 font-semibold">共識區間</p>
          <div className="grid grid-cols-2 gap-1">
            <span>EPS 平均 {n(data.eps.average)}</span>
            <span>分析師 {n(data.eps.analystCount, 0)}</span>
            <span>
              EPS 低 / 高 {n(data.eps.low)} / {n(data.eps.high)}
            </span>
            <span>營收平均 {n(data.revenue.average, 0)}</span>
            <span>
              營收低 / 高 {n(data.revenue.low, 0)} / {n(data.revenue.high, 0)}
            </span>
            <span>營收 YoY {pct(data.revenue.yearOverYearGrowth)}</span>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="mb-2 font-semibold">分析師目標價</p>
          {hasPriceTarget ? (
            <div className="grid grid-cols-2 gap-1">
              <span>目前 {n(data.priceTarget.currentPrice)}</span>
              <span>中位數 {n(data.priceTarget.median)}</span>
              <span>
                低 / 高 {n(data.priceTarget.low)} / {n(data.priceTarget.high)}
              </span>
              <span>平均潛在報酬 {pct(targetUpside)}</span>
            </div>
          ) : (
            <div className="py-2 text-[11px] text-muted-foreground">
              待分析師發布最新目標價與潛在評等
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <p className="mb-2 text-xs font-semibold">過去四季 EPS 實績</p>
        <table className="w-full min-w-[460px] text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th>季度</th>
              <th>預估</th>
              <th>實際</th>
              <th>Surprise</th>
              <th>結果</th>
            </tr>
          </thead>
          <tbody>
            {data.history.map(item => (
              <tr key={item.date} className="border-t">
                <td className="py-1">{item.date}</td>
                <td className="font-mono">{n(item.epsEstimate)}</td>
                <td className="font-mono">{n(item.epsActual)}</td>
                <td className="font-mono">{pct(item.surprisePercent)}</td>
                <td>
                  {item.epsActual === undefined ||
                  item.epsEstimate === undefined
                    ? '—'
                    : item.epsActual > item.epsEstimate
                      ? 'Beat'
                      : 'Miss'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {quartersWithEstimate.length > 0
            ? `Beat ${beats}/${quartersWithEstimate.length} · 平均 surprise ${pct(averageSurprise)}`
            : data.history.length > 0
              ? '歷史實際 EPS 已列出；共識預估與 Surprise 待新財報季公布前更新'
              : '暫無歷史季度 EPS 數據'}
        </p>
      </div>
    </section>
  )
}
