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
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Minervini SEPA
          </p>
          <h3 className="text-lg font-bold">{symbol} 趨勢模板</h3>
          <p className="text-xs text-muted-foreground">
            {data.score}/8 通過 · RS {data.rsRating.toFixed(0)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${data.stage === 2 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}
        >
          {data.stageLabel}
        </span>
      </header>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.conditions.map(condition => (
          <div
            key={condition.id}
            className="flex items-start gap-2 rounded-lg border p-2 text-xs"
          >
            <span>{condition.passed ? '✅' : '❌'}</span>
            <div>
              <p className="font-medium">{condition.label}</p>
              <p className="font-mono text-muted-foreground">
                {condition.actual}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="font-semibold">VCP 型態</p>
          <p className="mt-1">
            {data.vcp.detected ? '可能形成收縮' : '訊號不足'}
          </p>
          <p className="mt-1 text-muted-foreground">
            Pivot {data.vcp.pivot.toFixed(2)} · {data.vcp.explanation}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-zinc-900">
          <p className="font-semibold">交易計畫</p>
          <div className="mt-1 grid grid-cols-2 gap-1 font-mono">
            <span>Pivot {sizing.entryPivot.toFixed(2)}</span>
            <span>買入區上緣 {sizing.buyZoneHigh.toFixed(2)}</span>
            <span>停損 {sizing.stopPrice.toFixed(2)}</span>
            <span>損益兩平 {sizing.breakevenTrigger.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs">
          帳戶資金
          <input
            type="number"
            min="0"
            value={equity}
            onChange={event => setEquity(Number(event.target.value) || 0)}
            className="mt-1 w-full rounded border bg-transparent p-2 font-mono"
          />
        </label>
        <label className="text-xs">
          單筆風險 %
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={risk}
            onChange={event => setRisk(Number(event.target.value) || 1)}
            className="mt-1 w-full rounded border bg-transparent p-2 font-mono"
          />
        </label>
        <div className="rounded-lg bg-violet-50 p-3 text-xs dark:bg-violet-950/30">
          <p>建議股數</p>
          <p className="text-lg font-bold">{sizing.shares.toLocaleString()}</p>
          <p className="text-muted-foreground">
            風險額 ${sizing.riskAmount.toFixed(0)}
          </p>
        </div>
      </div>
    </section>
  )
}
