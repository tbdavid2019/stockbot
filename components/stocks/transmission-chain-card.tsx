'use client'

import * as React from 'react'
import type { TransmissionAnalysisResult } from '@/lib/deepear'

export function TransmissionChainCard({
  data
}: {
  data: TransmissionAnalysisResult
}) {
  return (
    <section className="w-full rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-zinc-950 dark:to-zinc-900/40 sm:p-6 text-slate-800 dark:text-slate-100 my-3">
      {/* Header */}
      <header className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
              DeepEar 邏輯傳導鏈
            </span>
            <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
              信心度: {(data.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {data.title}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {data.summary}
          </p>
        </div>

        {/* Signal Status Badge */}
        <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border shadow-2xs ${
              data.signalStatus === 'Strengthened'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                : data.signalStatus === 'Falsified'
                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {data.statusLabel}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            情緒評分: {data.sentimentScore > 0 ? `+${data.sentimentScore.toFixed(2)}` : data.sentimentScore.toFixed(2)}
          </span>
        </div>
      </header>

      {/* Multi-Node Transmission Chain */}
      <div className="space-y-3 mb-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <span>⛓️ 多層級傳導鏈結 (Multi-Tier Transmission Chain)</span>
        </h4>

        <div className="grid gap-3">
          {data.chain.map((step, idx) => (
            <div
              key={idx}
              className="relative rounded-xl border border-slate-200/80 bg-white dark:bg-zinc-900/90 dark:border-slate-800 p-3.5 shadow-2xs transition-all hover:border-cyan-500/40"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900 shrink-0">
                    {step.step}
                  </span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {step.node}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                    step.impact === 'positive'
                      ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : step.impact === 'negative'
                      ? 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {step.impactLabel}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 ml-7 leading-relaxed">
                {step.logic}
              </p>

              {step.affectedSectors && step.affectedSectors.length > 0 && (
                <div className="mt-2 ml-7 flex flex-wrap gap-1.5">
                  {step.affectedSectors.map((sec, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 font-mono"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Critical Falsification Checklist */}
      <div className="rounded-xl border border-red-500/20 bg-red-50/50 dark:bg-red-950/20 p-4 mb-4">
        <h4 className="text-xs font-bold text-red-900 dark:text-red-300 mb-2 flex items-center gap-1.5">
          <span>🚨 核心論點證偽判定點 (Falsification Criteria)</span>
        </h4>
        <p className="text-xs text-red-700/80 dark:text-red-300/80 mb-2.5">
          若市場或企業出現以下任一狀況，代表原投資邏輯已被「證偽 (Falsified)」，應嚴格啟動風險停損：
        </p>
        <ul className="space-y-1.5 text-xs text-red-800 dark:text-red-200 font-medium">
          {data.falsificationCriteria.map((crit, cIdx) => (
            <li key={cIdx} className="flex items-start gap-1.5">
              <span className="text-red-500 mt-0.5">•</span>
              <span>{crit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actionable Insights */}
      {data.actionableInsights && (
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 dark:bg-zinc-900/60 dark:border-slate-800/80 p-3.5 flex items-start gap-2.5 text-xs">
          <div className="size-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0 font-bold">
            💡
          </div>
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              機構操盤結論：
            </span>
            <span className="text-slate-600 dark:text-slate-300 ml-1">
              {data.actionableInsights}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
