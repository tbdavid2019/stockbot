'use client'

import { useMemo, useState } from 'react'
import {
  generatePayoffCurve,
  summarizePayoff,
  theoreticalPayoff,
  type OptionLeg,
  type OptionStrategy
} from '@/lib/quant/black-scholes'

interface Props {
  symbol: string
  data: {
    strategy: OptionStrategy
    legs: OptionLeg[]
    spot: number
    strike: number
    dte: number
    iv: number
    riskFreeRate?: number
  }
}
const money = (value: number) =>
  `${value >= 0 ? '' : '-'}$${Math.abs(value).toFixed(2)}`

export function OptionsPayoffCard({ symbol, data }: Props) {
  const [spot, setSpot] = useState(data.spot)
  const [strike, setStrike] = useState(data.strike)
  const [dte, setDte] = useState(data.dte)
  const [iv, setIv] = useState(data.iv * 100)
  const legs = useMemo(
    () =>
      data.legs.map(leg => ({
        ...leg,
        strike: leg.strike + (strike - data.strike)
      })),
    [data.legs, data.strike, strike]
  )
  const curve = useMemo(
    () => generatePayoffCurve(legs, spot, dte, iv / 100, 61),
    [dte, iv, legs, spot]
  )
  const summary = useMemo(() => summarizePayoff(curve), [curve])
  const theoretical = theoreticalPayoff(
    spot,
    legs,
    dte,
    iv / 100,
    data.riskFreeRate
  )
  const maxAbs = Math.max(
    1,
    ...curve.map(point => Math.abs(point.expiry)),
    ...curve.map(point => Math.abs(point.theoretical))
  )
  const path = (key: 'expiry' | 'theoretical') =>
    curve
      .map(
        (point, index) =>
          `${index ? 'L' : 'M'} ${(index / (curve.length - 1)) * 100} ${50 - (point[key] / maxAbs) * 42}`
      )
      .join(' ')
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Black-Scholes 期權損益模擬器
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            {symbol} {data.strategy} 策略
          </h3>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            理論曲線與到期損益試算（每股）
          </p>
        </div>
        <div className="text-right text-xs sm:text-sm font-mono space-y-0.5">
          <p>最大利潤：<strong className="text-emerald-600 dark:text-emerald-400">{money(summary.maxProfit)}</strong></p>
          <p>最大損失：<strong className="text-rose-600 dark:text-rose-400">{money(summary.maxLoss)}</strong></p>
          <p>現值 P&L：<strong className="text-foreground">{money(theoretical)}</strong></p>
        </div>
      </header>
      <div className="grid gap-3.5 sm:grid-cols-4">
        {[
          [`Spot 現價 ${spot.toFixed(2)}`, spot, setSpot, 1, 1000],
          [`Strike 履約價 ${strike.toFixed(2)}`, strike, setStrike, 1, 1000],
          [`DTE 到期天數 ${dte} 日`, dte, setDte, 1, 730],
          [`IV 隱含波動率 ${iv.toFixed(1)}%`, iv, setIv, 1, 200]
        ].map(([label, value, setter, min, max]) => (
          <label key={String(label)} className="text-xs sm:text-sm font-semibold text-foreground">
            {String(label)}
            <input
              className="mt-1.5 w-full accent-orange-500 cursor-pointer"
              type="range"
              min={Number(min)}
              max={Number(max)}
              step={String(label).startsWith('IV') ? 0.5 : 1}
              value={Number(value)}
              onChange={event =>
                (setter as (value: number) => void)(Number(event.target.value))
              }
            />
          </label>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-slate-50/80 p-4 dark:bg-zinc-900/80 border border-slate-100 dark:border-zinc-800">
        <svg
          viewBox="0 0 100 100"
          className="h-52 w-full"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            x2="100"
            y1="50"
            y2="50"
            stroke="currentColor"
            strokeOpacity=".2"
          />
          <path
            d={path('expiry')}
            fill="none"
            stroke="#f97316"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path('theoretical')}
            fill="none"
            stroke="#2563eb"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-3 flex flex-wrap justify-between text-xs sm:text-sm font-medium text-muted-foreground gap-2">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#f97316]"></span>到期損益曲線 (Expiry)</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#2563eb]"></span>理論損益曲線 (Current)</span>
          <span>
            損益兩平點：{' '}
            <strong className="text-foreground font-mono">
              {summary.breakevens.map(value => value.toFixed(2)).join(', ') || '—'}
            </strong>
          </span>
        </div>
      </div>
    </section>
  )
}
