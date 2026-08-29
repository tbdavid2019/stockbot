import type { MarketImpactResult } from '@/lib/quant/microstructure'

interface Props {
  symbol: string
  data: {
    price?: number
    averageVolume?: number
    floatShares?: number
    amihud?: number
    floatTurnover?: number
    impact: MarketImpactResult
    orderSize: number
    curve: Array<{ orderSize: number; impactBps: number }>
  }
}
const n = (value?: number, digits = 2) =>
  value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits)
export function StockLiquidityCard({ symbol, data }: Props) {
  const tier =
    data.impact.impactBps < 10 ? '高' : data.impact.impactBps < 50 ? '中' : '低'
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
            Market Microstructure
          </p>
          <h3 className="text-lg font-bold">{symbol} 流動性分析</h3>
        </div>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
          流動性：{tier}
        </span>
      </header>
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">Amihud</p>
          <p className="font-mono font-semibold">{n(data.amihud, 6)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">年化 Float Turnover</p>
          <p className="font-mono font-semibold">
            {data.floatTurnover === undefined
              ? '—'
              : `${(data.floatTurnover * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">
            {data.orderSize.toLocaleString()} 股衝擊
          </p>
          <p className="font-mono font-semibold">
            {n(data.impact.impactBps, 1)} bps
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">交易天數</p>
          <p className="font-mono font-semibold">
            {data.averageVolume && data.floatShares
              ? n(data.floatShares / data.averageVolume)
              : '—'}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold">
          Square-root market impact 曲線
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
          {data.curve.map(item => (
            <div key={item.orderSize} className="rounded border p-2">
              <p>{item.orderSize.toLocaleString()} 股</p>
              <p className="font-mono text-cyan-600">
                {item.impactBps.toFixed(1)} bps
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          σ√(Q/V) · 估算價差與衝擊，不代表保證成交成本。
        </p>
      </div>
    </section>
  )
}
