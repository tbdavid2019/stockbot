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
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
            Black-Scholes Simulator
          </p>
          <h3 className="text-lg font-bold">
            {symbol} {data.strategy}
          </h3>
          <p className="text-xs text-muted-foreground">
            理論曲線與到期損益（每股）
          </p>
        </div>
        <div className="text-right text-xs">
          <p>最大利潤 {money(summary.maxProfit)}</p>
          <p>最大損失 {money(summary.maxLoss)}</p>
          <p>現值 P&L {money(theoretical)}</p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          [`Spot ${spot.toFixed(2)}`, spot, setSpot, 1, 1000],
          [`Strike ${strike.toFixed(2)}`, strike, setStrike, 1, 1000],
          [`DTE ${dte}`, dte, setDte, 1, 730],
          [`IV ${iv.toFixed(1)}%`, iv, setIv, 1, 200]
        ].map(([label, value, setter, min, max]) => (
          <label key={String(label)} className="text-xs">
            {String(label)}
            <input
              className="mt-1 w-full accent-orange-500"
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
      <div className="mt-4 rounded-xl bg-slate-50 p-2 dark:bg-zinc-900">
        <svg
          viewBox="0 0 100 100"
          className="h-48 w-full"
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
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>到期損益</span>
          <span>理論損益</span>
          <span>
            Break-even{' '}
            {summary.breakevens.map(value => value.toFixed(2)).join(', ') ||
              '—'}
          </span>
        </div>
      </div>
    </section>
  )
}
