import type { ValuationResult } from '@/lib/quant/valuation'

interface Props {
  symbol: string
  price?: number
  data: ValuationResult
}

const money = (value?: number) =>
  value === undefined || !Number.isFinite(value) ? '—' : `$${value.toFixed(2)}`
const percent = (value?: number) =>
  value === undefined || !Number.isFinite(value)
    ? '—'
    : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`

export function CompanyValuationCard({ symbol, price, data }: Props) {
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            量化估值模型
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{symbol} 合理價</h3>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            5 年 FCFF DCF + 同業倍數 · WACC {percent(data.capm.wacc * 100)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">綜合合理價</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {money(data.blendedFairValue)}
          </p>
          <p className="mt-0.5 text-xs sm:text-sm font-semibold">
            {percent(data.impliedUpsideDownside)} vs {money(price)}
          </p>
        </div>
      </header>
      <div className="grid gap-3.5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground">DCF 內在股價</p>
          <p className="my-1.5 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight">
            {money(data.dcf?.sharePrice)}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            5 年 FCFF · β {data.capm.beta.toFixed(2)}
            {data.capm.usedDefaultBeta ? '（產業預設）' : ''}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground">同業倍數中位數</p>
          <p className="my-1.5 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight">
            {money(data.peers.blendedValue)}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {data.peers.multiplesUsed.join(' · ') || '同業資料待補充'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground">加權平均資本成本</p>
          <p className="my-1.5 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight">
            WACC {(data.capm.wacc * 100).toFixed(2)}%
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            CAPM 股權成本 {(data.capm.costOfEquity * 100).toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <p className="mb-2.5 text-xs sm:text-sm font-bold text-foreground">
          WACC × 終值成長率敏感度矩陣（每股合理價 / 相對現價空間）
        </p>
        <table className="w-full min-w-[540px] border-collapse text-center text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-100/70 dark:bg-zinc-900/70">
              <th className="border border-slate-200 p-2 text-left font-semibold dark:border-slate-800">WACC ↓ / g →</th>
              {data.sensitivity[0]?.map(cell => (
                <th key={cell.terminalGrowth} className="border border-slate-200 p-2 font-semibold dark:border-slate-800">
                  {(cell.terminalGrowth * 100).toFixed(1)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sensitivity.map((row, rowIndex) => (
              <tr key={row[0]?.wacc}>
                <th className="border border-slate-200 bg-slate-50/60 p-2 text-left font-semibold dark:border-slate-800 dark:bg-zinc-900/40">
                  {(row[0].wacc * 100).toFixed(1)}%
                </th>
                {row.map((cell, columnIndex) => (
                  <td
                    key={`${rowIndex}-${columnIndex}`}
                    className={`border border-slate-200 p-2 font-mono dark:border-slate-800 ${
                      rowIndex === 2 && columnIndex === 2
                        ? 'bg-emerald-100 font-bold text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200'
                        : ''
                    }`}
                  >
                    <div className="font-semibold">{money(cell.sharePrice)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {percent(cell.upsideDownside)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
