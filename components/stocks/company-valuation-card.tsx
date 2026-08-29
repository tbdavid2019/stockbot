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
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            量化估值模型
          </p>
          <h3 className="text-lg font-bold">{symbol} 合理價</h3>
          <p className="text-xs text-muted-foreground">
            DCF + 同業倍數 · WACC {percent(data.capm.wacc * 100)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">綜合合理價</p>
          <p className="text-xl font-bold text-emerald-600">
            {money(data.blendedFairValue)}
          </p>
          <p className="text-xs">
            {percent(data.impliedUpsideDownside)} vs {money(price)}
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
          <p className="text-xs text-muted-foreground">DCF 股價</p>
          <p className="font-mono font-semibold">
            {money(data.dcf?.sharePrice)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            5 年 FCFF · β {data.capm.beta.toFixed(2)}
            {data.capm.usedDefaultBeta ? '（產業預設）' : ''}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
          <p className="text-xs text-muted-foreground">同業倍數中位數</p>
          <p className="font-mono font-semibold">
            {money(data.peers.blendedValue)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {data.peers.multiplesUsed.join(' · ') || '資料不足'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900">
          <p className="text-xs text-muted-foreground">資本成本</p>
          <p className="font-mono font-semibold">
            WACC {(data.capm.wacc * 100).toFixed(2)}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            CAPM {(data.capm.costOfEquity * 100).toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <p className="mb-2 text-xs font-semibold">
          WACC × 終值成長率敏感度（股價 / 相對現價）
        </p>
        <table className="w-full min-w-[520px] border-collapse text-center text-[11px]">
          <thead>
            <tr>
              <th className="border p-1 text-left">WACC ↓ / g →</th>
              {data.sensitivity[0]?.map(cell => (
                <th key={cell.terminalGrowth} className="border p-1">
                  {(cell.terminalGrowth * 100).toFixed(1)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sensitivity.map((row, rowIndex) => (
              <tr key={row[0]?.wacc}>
                <th className="border p-1 text-left">
                  {(row[0].wacc * 100).toFixed(1)}%
                </th>
                {row.map((cell, columnIndex) => (
                  <td
                    key={`${rowIndex}-${columnIndex}`}
                    className={`border p-1 font-mono ${rowIndex === 2 && columnIndex === 2 ? 'bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' : ''}`}
                  >
                    <div>{money(cell.sharePrice)}</div>
                    <div className="text-[10px] text-muted-foreground">
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
