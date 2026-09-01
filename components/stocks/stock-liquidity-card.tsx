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
    data.impact.impactBps < 10 ? '高 (優異)' : data.impact.impactBps < 50 ? '中 (尚可)' : '低 (留意滑價)'
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Market Microstructure 市場微結構
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{symbol} 流動性與衝擊成本分析</h3>
        </div>
        <span className="rounded-full bg-cyan-100 px-3.5 py-1 text-xs sm:text-sm font-bold text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
          流動性評級：{tier}
        </span>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">Amihud 非流動性指標</p>
          <p className="my-1.5 font-mono text-xl sm:text-2xl font-extrabold">{n(data.amihud, 6)}</p>
          <p className="text-xs text-muted-foreground">數值越低流動性越好</p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">年化 Float Turnover</p>
          <p className="my-1.5 font-mono text-xl sm:text-2xl font-extrabold">
            {data.floatTurnover === undefined
              ? '—'
              : `${(data.floatTurnover * 100).toFixed(1)}%`}
          </p>
          <p className="text-xs text-muted-foreground">自由流通股週轉率</p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">
            {data.orderSize.toLocaleString()} 股衝擊
          </p>
          <p className="my-1.5 font-mono text-xl sm:text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">
            {n(data.impact.impactBps, 1)} bps
          </p>
          <p className="text-xs text-muted-foreground">預期滑價點數</p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">流通盤出清天數</p>
          <p className="my-1.5 font-mono text-xl sm:text-2xl font-extrabold">
            {data.averageVolume && data.floatShares
              ? n(data.floatShares / data.averageVolume)
              : '—'}{' '}
            <span className="text-xs font-normal text-muted-foreground">天</span>
          </p>
          <p className="text-xs text-muted-foreground">Days to Liquidate</p>
        </div>
      </div>
      <div className="mt-5">
        <p className="mb-2.5 text-xs sm:text-sm font-bold text-foreground">
          Square-Root Market Impact 衝擊成本曲線
        </p>
        <div className="grid grid-cols-2 gap-2.5 text-xs sm:text-sm sm:grid-cols-5">
          {data.curve.map(item => (
            <div key={item.orderSize} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-zinc-900/60 p-3">
              <p className="font-semibold text-muted-foreground">{item.orderSize.toLocaleString()} 股</p>
              <p className="my-0.5 font-mono text-base sm:text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {item.impactBps.toFixed(1)} bps
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
          公式：σ√(Q/V) · 估算單筆大單的市價單推升/砸盤衝擊成本，供部位進出場參考。
        </p>
      </div>
    </section>
  )
}
