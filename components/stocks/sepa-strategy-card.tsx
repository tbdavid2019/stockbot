'use client'

import { useMemo, useState } from 'react'
import { calculatePositionSizing, type SepaAnalysis } from '@/lib/quant/sepa'

export function SepaStrategyCard({
  symbol,
  data
}: {
  symbol: string
  data: SepaAnalysis
}) {
  const [equity, setEquity] = useState(data.positionSizing.accountEquity)
  const [risk, setRisk] = useState(data.positionSizing.riskPercent)
  const sizing = useMemo(
    () =>
      calculatePositionSizing({
        accountEquity: equity,
        riskPercent: risk,
        entryPivot: data.positionSizing.entryPivot
      }),
    [data.positionSizing.entryPivot, equity, risk]
  )
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Minervini SEPA 趨勢動能
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{symbol} 趨勢模板</h3>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            {data.score}/8 項條件通過 · RS 強度評級 {data.rsRating.toFixed(0)}
          </p>
        </div>
        <span
          className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-bold ${data.stage === 2 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}
        >
          {data.stageLabel}
        </span>
      </header>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {data.conditions.map(condition => (
          <div
            key={condition.id}
            className="flex items-start gap-2.5 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 p-3 text-xs sm:text-sm"
          >
            <span className="text-base">{condition.passed ? '✅' : '❌'}</span>
            <div>
              <p className="font-semibold text-foreground">{condition.label}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                {condition.actual}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="font-bold text-foreground">VCP 波動收縮型態</p>
          <p className="mt-1 font-medium">
            {data.vcp.detected ? '可能形成收縮突破' : '收縮訊號尚待確認'}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Pivot 關鍵買點 {data.vcp.pivot.toFixed(2)} · {data.vcp.explanation}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 p-4 text-xs sm:text-sm dark:bg-zinc-900/80">
          <p className="font-bold text-foreground">SEPA 紀律交易計畫</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 font-mono text-xs sm:text-sm">
            <span>Pivot: <strong className="text-foreground">{sizing.entryPivot.toFixed(2)}</strong></span>
            <span>買入區上緣: <strong className="text-foreground">{sizing.buyZoneHigh.toFixed(2)}</strong></span>
            <span>停損點: <strong className="text-rose-600 dark:text-rose-400">{sizing.stopPrice.toFixed(2)}</strong></span>
            <span>損益兩平: <strong className="text-foreground">{sizing.breakevenTrigger.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs sm:text-sm font-semibold">
          帳戶總資金 ($)
          <input
            type="number"
            min="0"
            value={equity}
            onChange={event => setEquity(Number(event.target.value) || 0)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-2.5 font-mono text-sm"
          />
        </label>
        <label className="text-xs sm:text-sm font-semibold">
          單筆風險承受度 (%)
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={risk}
            onChange={event => setRisk(Number(event.target.value) || 1)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent p-2.5 font-mono text-sm"
          />
        </label>
        <div className="rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/80 p-3.5 sm:p-4 text-xs sm:text-sm dark:bg-violet-950/40">
          <p className="text-xs sm:text-sm font-semibold text-violet-800 dark:text-violet-300">建議建倉股數</p>
          <p className="my-0.5 font-mono text-2xl sm:text-3xl font-extrabold text-violet-900 dark:text-violet-100">{sizing.shares.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            最高風險額 ${sizing.riskAmount.toFixed(0)}
          </p>
        </div>
      </div>
    </section>
  )
}
