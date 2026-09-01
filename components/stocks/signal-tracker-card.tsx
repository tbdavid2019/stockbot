'use client'

import * as React from 'react'

export interface SignalTrackerData {
  symbol: string
  companyName?: string
  hypothesis: string
  status: 'Strengthened' | 'Weakened' | 'Falsified' | 'Unchanged'
  statusLabel: string
  evidence: string[]
  falsificationTriggers: string[]
  suggestedAction: string
  sentimentScore: number
  confidence: number
}

export function SignalTrackerCard({ data }: { data: SignalTrackerData }) {
  return (
    <section className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6 text-slate-800 dark:text-slate-100 my-3">
      {/* Header */}
      <header className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              AlphaEar 訊號演化追蹤器
            </span>
            <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-mono">
              {data.symbol} {data.companyName ? `(${data.companyName})` : ''}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {data.symbol} 投資假說與論點驗證
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">原核心論點：</strong>
            {data.hypothesis}
          </p>
        </div>

        {/* 4-State Status */}
        <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center px-3.5 py-1 text-xs sm:text-sm font-bold rounded-full border shadow-xs ${
              data.status === 'Strengthened'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                : data.status === 'Falsified'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {data.statusLabel}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            信心度: {(data.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </header>

      {/* New Evidence & Market Development */}
      <div className="mb-5">
        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
          <span>🔍 最新市場佐證與數據演化</span>
        </h4>
        <div className="space-y-2.5">
          {data.evidence.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 dark:bg-zinc-900/60 dark:border-slate-800/80 p-3.5 text-xs sm:text-sm"
            >
              <span className="text-indigo-500 font-bold shrink-0">#{idx + 1}</span>
              <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Falsification Criteria */}
      <div className="rounded-xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-4 sm:p-5 mb-4">
        <h4 className="text-sm font-bold text-rose-900 dark:text-red-300 mb-2 flex items-center gap-1.5">
          <span>🚨 關鍵證偽條件 (Invalidation Triggers)</span>
        </h4>
        <p className="text-xs sm:text-sm text-rose-700/90 dark:text-red-300/90 mb-2.5">
          當觸發以下任一條件時，視為原投資假說失效，切勿死扛：
        </p>
        <ul className="space-y-2 text-xs sm:text-sm text-rose-900 dark:text-red-200 font-medium">
          {data.falsificationTriggers.map((trig, tIdx) => (
            <li key={tIdx} className="flex items-start gap-2">
              <span className="text-rose-500 mt-0.5 font-bold">•</span>
              <span>{trig}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Recommendation */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center justify-between gap-3 text-xs sm:text-sm shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🎯</span>
          <div>
            <span className="font-semibold text-slate-200">操作建議：</span>
            <span className="font-bold text-amber-300 ml-1.5 text-sm sm:text-base">{data.suggestedAction}</span>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          動態風險控管
        </span>
      </div>
    </section>
  )
}
