'use client'

import * as React from 'react'
import type { MacroFactorRegimeResult } from '@/lib/quant/us-fddk'

export function MacroFactorRegimeCard({
  data
}: {
  data: MacroFactorRegimeResult
}) {
  return (
    <section className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6 text-slate-800 dark:text-slate-100 my-3">
      {/* Header */}
      <header className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              US FDDK 20年凍結研究
            </span>
            <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-mono">
              基準期: 2004–2026 (資料迄 {data.asOfDate})
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {data.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {data.summary}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 text-xs sm:text-sm text-right shrink-0">
          <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
            {data.activeStrategy.name}
          </p>
          <p className="font-bold text-slate-900 dark:text-slate-100 font-mono text-base sm:text-lg mt-0.5">
            CAGR {(data.activeStrategy.cagr * 100).toFixed(1)}% · 夏普 {data.activeStrategy.sharpe.toFixed(2)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
            最大回撤 {(data.activeStrategy.maxDrawdown * 100).toFixed(1)}%
          </p>
        </div>
      </header>

      {/* Benchmarks Comparison Table */}
      <div className="mb-4 overflow-x-auto">
        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1.5">
          <span>📊 20 年跨資產 ETF 策略與基準對照 (扣除換手成本 10/50 bps)</span>
        </h4>
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-muted-foreground bg-slate-50/50 dark:bg-zinc-900/40">
              <th className="p-2.5 pr-3 font-semibold">配置策略 / 基準</th>
              <th className="p-2.5 font-semibold">角色定位</th>
              <th className="p-2.5 font-semibold font-mono text-right">20年 CAGR</th>
              <th className="p-2.5 font-semibold font-mono text-right">夏普比率</th>
              <th className="p-2.5 font-semibold font-mono text-right">最大跌幅</th>
              <th className="p-2.5 pl-2 font-semibold font-mono text-right">Beta / 下跌捕獲</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {data.baselines.map(b => (
              <tr key={b.key} className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/50 transition-colors">
                <td className="py-3 pr-3">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">{b.label}</div>
                  <div className="text-xs text-muted-foreground">{b.detail}</div>
                </td>
                <td className="py-3 p-2.5">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 font-medium text-slate-700 dark:text-slate-300">
                    {b.role}
                  </span>
                </td>
                <td className="py-3 p-2.5 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                  {(b.cagr * 100).toFixed(1)}%
                </td>
                <td className="py-3 p-2.5 font-mono text-right font-semibold">
                  {b.sharpe.toFixed(2)}
                </td>
                <td className="py-3 p-2.5 font-mono text-right text-rose-600 dark:text-rose-400 font-semibold">
                  {(b.maxDrawdown * 100).toFixed(1)}%
                </td>
                <td className="py-3 pl-2 font-mono text-right text-muted-foreground text-xs">
                  {b.betaToSpy.toFixed(2)} / {(b.downCaptureVsSpy * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Institutional Insights */}
      {data.institutionalInsights && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 dark:bg-zinc-900/60 dark:border-slate-800 p-4 flex items-start gap-3 text-xs sm:text-sm">
          <span className="text-lg">💡</span>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              機構實證結論：
            </span>
            <span className="text-slate-700 dark:text-slate-300 ml-1 leading-relaxed">
              {data.institutionalInsights}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
