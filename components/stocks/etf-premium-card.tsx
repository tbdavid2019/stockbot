import type { EtfPremiumResult } from '@/lib/quant/microstructure'

const n = (value?: number, digits = 2) =>
  value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits)
export function EtfPremiumCard({
  data
}: {
  data: EtfPremiumResult & { symbol: string }
}) {
  const hasNav = data.nav > 0
  const label = !hasNav
    ? 'NAV 待確認'
    : data.direction === 'premium'
      ? '溢價 (Premium)'
      : data.direction === 'discount'
        ? '折價 (Discount)'
        : '接近 NAV 淨值'
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
            ETF NAV Monitor 淨值監控
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{data.symbol} 溢折價與 Dealer GEX</h3>
        </div>
        <span
          className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-bold border ${data.direction === 'premium' && hasNav ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' : data.direction === 'discount' && hasNav ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700'}`}
        >
          {label}
        </span>
      </header>
      <div className="grid gap-3.5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">即時市價 (Price)</p>
          <p className="my-1.5 font-mono text-2xl font-extrabold">${n(data.price)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">基金淨值 (NAV)</p>
          <p className="my-1.5 font-mono text-2xl font-extrabold">
            {hasNav ? `$${n(data.nav)}` : '待確認'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">NAV 溢折價幅度</p>
          <p className="my-1.5 font-mono text-2xl font-extrabold text-fuchsia-600 dark:text-fuchsia-400">
            {hasNav ? `${n(data.divergencePercent)}%` : '待確認'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="text-muted-foreground font-semibold">Dealer GEX 伽瑪暴露</p>
          <p className="my-1.5 font-mono text-2xl font-extrabold">{n(data.gex, 0)}</p>
          <p className="text-xs text-muted-foreground">
            {data.gammaCondition === 'unknown' ? '狀態待確認' : data.gammaCondition}
          </p>
        </div>
      </div>
      <p className="mt-4 text-xs sm:text-sm text-muted-foreground">
        買賣價差 (Bid-Ask Spread) {n(data.bidAskSpreadBps, 1)} bps · 同類 ETF 中位數 divergence{' '}
        {n(data.peerMedianDivergence)}%
      </p>
    </section>
  )
}
