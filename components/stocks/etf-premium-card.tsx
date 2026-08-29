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
      ? '溢價'
      : data.direction === 'discount'
        ? '折價'
        : '接近 NAV'
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
            ETF NAV Monitor
          </p>
          <h3 className="text-lg font-bold">{data.symbol} 溢折價與 GEX</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${data.direction === 'premium' && hasNav ? 'bg-amber-100 text-amber-700' : data.direction === 'discount' && hasNav ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
        >
          {label}
        </span>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">市價</p>
          <p className="font-mono font-semibold">{n(data.price)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">NAV</p>
          <p className="font-mono font-semibold">
            {hasNav ? n(data.nav) : '待確認'}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">NAV divergence</p>
          <p className="font-mono font-semibold">
            {hasNav ? `${n(data.divergencePercent)}%` : '待確認'}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="text-muted-foreground">Dealer GEX</p>
          <p className="font-mono font-semibold">{n(data.gex, 0)}</p>
          <p className="text-[11px] text-muted-foreground">
            {data.gammaCondition === 'unknown' ? '待確認' : data.gammaCondition}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Bid-ask {n(data.bidAskSpreadBps, 1)} bps · 同類 ETF 中位數 divergence{' '}
        {n(data.peerMedianDivergence)}%
      </p>
    </section>
  )
}
