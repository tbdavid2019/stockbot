'use client'

import * as React from 'react'
import type { StockdataRecord, StockdataResult } from '@/lib/stockdata/types'

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function rowsFrom(data: unknown): StockdataRecord[] {
  if (Array.isArray(data)) return data.filter(item => item && typeof item === 'object') as StockdataRecord[]
  if (data && typeof data === 'object') {
    const record = data as StockdataRecord
    const containers = [record, record.data && typeof record.data === 'object' ? record.data as StockdataRecord : undefined].filter(Boolean) as StockdataRecord[]
    for (const container of containers) {
      for (const key of ['data', 'items', 'results', 'markets', 'target_rates', 'history', 'earnings_calendar', 'economic_calendar', 'commodities', 'probabilities', 'events']) {
        if (Array.isArray(container[key])) return container[key].filter(item => item && typeof item === 'object') as StockdataRecord[]
      }
    }
  }
  return []
}

function titleFromRow(row: StockdataRecord, fallback: string) {
  return display(row.ticker ?? row.symbol ?? row.name ?? row.question ?? row.broker_name ?? fallback)
}

function SourceMeta({ result }: { result: StockdataResult<unknown> }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="rounded-full border px-2 py-0.5">Stockdata REST</span>
      <span>狀態：{result.status}</span>
      {result.source.asOf && <span>資料截至：{result.source.asOf}</span>}
      <span>擷取：{result.source.fetchedAt}</span>
    </div>
  )
}

function ResultShell({
  title,
  result,
  children,
  disclaimer
}: {
  title: string
  result: StockdataResult<unknown>
  children: React.ReactNode
  disclaimer?: string
}) {
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="mb-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">外部量化資料</span>
        </div>
        <SourceMeta result={result} />
      </header>
      {result.status === 'unavailable' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          Stockdata 目前無法提供這項資料；既有本地功能不受影響。
        </div>
      )}
      {children}
      {disclaimer && <p className="mt-3 text-xs text-muted-foreground">{disclaimer}</p>}
      {result.warnings.length > 0 && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">⚠️ {result.warnings.join('；')}</p>}
    </section>
  )
}

function GenericRows({ result, fallback }: { result: StockdataResult<unknown>; fallback: string }) {
  const rows = rowsFrom(result.data).slice(0, 15)
  if (rows.length === 0) {
    const data = result.data && typeof result.data === 'object' ? result.data as StockdataRecord : undefined
    return data ? (
      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(data).filter(([, value]) => !Array.isArray(value) && typeof value !== 'object').slice(0, 18).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-zinc-900">
            <span className="text-muted-foreground">{key}</span><span className="ml-2 font-medium">{display(value)}</span>
          </div>
        ))}
      </div>
    ) : <p className="text-sm text-muted-foreground">{fallback}</p>
  }
  const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row)))).filter(key => !['url', 'links'].includes(key)).slice(0, 6)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead><tr className="border-b text-muted-foreground dark:border-slate-800">{keys.map(key => <th key={key} className="p-2 font-semibold">{key}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${titleFromRow(row, fallback)}-${index}`} className="border-b last:border-0 dark:border-slate-900">{keys.map(key => <td key={key} className="p-2 align-top">{display(row[key])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export function PredictionTopPicksCard({ result, title = 'Stockdata 模型選股' }: { result: StockdataResult<unknown>; title?: string }) {
  return <ResultShell title={title} result={result} disclaimer="這是模型預測與排序，不是保證報酬或投資建議。"><GenericRows result={result} fallback="目前沒有可核實的模型排行。" /></ResultShell>
}

export function ResonanceCard({ result }: { result: StockdataResult<unknown> }) {
  return <ResultShell title="Stockdata 多策略共振" result={result} disclaimer="共振分類只採用上游回傳的 tags；未回傳的分類不自行推導。"><GenericRows result={result} fallback="目前沒有可核實的共振標的。" /></ResultShell>
}

export function PredictionHistoryCard({ result, ticker }: { result: StockdataResult<unknown>; ticker?: string }) {
  return <ResultShell title={`${ticker || '個股'} 預測歷史軌跡`} result={result} disclaimer="歷史預測僅呈現上游實際回傳欄位，缺少的數值不補值。"><GenericRows result={result} fallback="目前沒有可核實的預測歷史。" /></ResultShell>
}

export function BrokerBranchCard({ result, ticker }: { result: StockdataResult<unknown>; ticker?: string }) {
  return <ResultShell title={`${ticker || '個股'} 券商分點主力進出`} result={result} disclaimer="券商分點資料不等同於法人流向；官方三大法人仍由既有 TWSE/TPEX 卡片呈現。"><GenericRows result={result} fallback="目前沒有可核實的分點資料。" /></ResultShell>
}

export function InstitutionalLeaderboardCard({ result }: { result: StockdataResult<unknown> }) {
  return <ResultShell title="全市場三大法人買賣超排行" result={result}><GenericRows result={result} fallback="目前沒有可核實的法人排行。" /></ResultShell>
}

export function CompanyProfileCard({ result, ticker }: { result: StockdataResult<unknown>; ticker?: string }) {
  const data = result.data && typeof result.data === 'object' ? result.data as StockdataRecord : undefined
  const news = Array.isArray(data?.recent_news) ? data.recent_news.filter(item => item && typeof item === 'object') as StockdataRecord[] : []
  const hasProfile = Boolean(data && (data.name || data.business_summary || data.market_cap))
  return <ResultShell title={`${display(data?.name) !== '—' ? display(data?.name) : ticker || '公司'} 公司簡介與即時新聞`} result={result}>
    {hasProfile ? <div className="grid gap-2 sm:grid-cols-2">{['ticker', 'name', 'industry', 'business_summary', 'chairman', 'market_cap', 'established'].map(key => <div key={key} className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-zinc-900"><span className="text-muted-foreground">{key}</span><p className="mt-1 font-medium">{display(data?.[key])}</p></div>)}</div> : <GenericRows result={result} fallback="目前沒有可核實的公司資料。" />}
    {hasProfile && (
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t text-base">
        <span className="text-muted-foreground font-medium">需要查看母子公司與轉投資關係？</span>
        <a
          href={`/?q=${encodeURIComponent(`${display(data?.name) !== '—' ? display(data?.name) : ticker || ''} 關係企業與轉投資圖譜`)}`}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>查看台灣公司關係網圖譜</span>
          <span>→</span>
        </a>
      </div>
    )}
    {news.length > 0 && <div className="mt-3 space-y-2">{news.slice(0, 5).map((item, index) => <a key={`${display(item.title)}-${index}`} className="block rounded-lg border p-3 text-xs hover:border-violet-400" href={typeof item.url === 'string' && item.url.startsWith('http') ? item.url : '#'} target="_blank" rel="noreferrer"><p className="font-semibold">{display(item.title)}</p><p className="mt-1 text-muted-foreground">{display(item.snippet)}</p></a>)}</div>}
  </ResultShell>
}

export function MacroRiskRegimeCard({ result }: { result: StockdataResult<unknown> }) {
  const data = result.data && typeof result.data === 'object' ? result.data as StockdataRecord : undefined
  const exposure = typeof data?.exposure === 'number' && data.exposure >= 0 && data.exposure <= 1 ? data.exposure : undefined
  return <ResultShell title="Stockdata 市場宏觀風險 Regime" result={result} disclaimer="曝險比例是上游風控模型輸出，不代表個人化投資建議。">
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-900"><p className="text-xs text-muted-foreground">Regime</p><p className="mt-1 text-lg font-bold">{display(data?.regime_name)}</p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-900"><p className="text-xs text-muted-foreground">建議曝險</p><p className="mt-1 font-mono text-2xl font-bold">{exposure === undefined ? '—' : `${(exposure * 100).toFixed(0)}%`}</p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-900"><p className="text-xs text-muted-foreground">VIX</p><p className="mt-1 font-mono text-2xl font-bold">{display(data?.vix)}</p></div></div>
    <div className="mt-3"><GenericRows result={result} fallback="目前沒有可核實的宏觀 regime。" /></div>
  </ResultShell>
}

export function StockdataMacroDatasetCard({ result, title = 'Stockdata 宏觀資料集' }: { result: StockdataResult<unknown>; title?: string }) {
  return <ResultShell title={title} result={result}><GenericRows result={result} fallback="目前沒有可核實的宏觀資料。" /></ResultShell>
}

export function PolymarketSentimentCard({ result }: { result: StockdataResult<unknown> }) {
  return <ResultShell title="Polymarket 預測市場情緒" result={result} disclaimer="這是預測市場參與者的機率與情緒，不是已發生的事實，也不是模型保證。"><GenericRows result={result} fallback="目前找不到可核實的預測市場讀數。" /></ResultShell>
}
