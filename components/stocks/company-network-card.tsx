'use client'

import * as React from 'react'
import type { TaiwanCompanyRecord, TaiwanCompanyAffiliate } from '@/lib/quant/taiwan-company-network'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Network,
  Building2,
  MessageSquare,
  ShieldCheck,
  MapPin,
  UserCheck,
  Coins,
  ChevronRight,
  GitFork,
  ArrowUpRight
} from 'lucide-react'

export interface CompanyNetworkCardProps {
  record?: TaiwanCompanyRecord | null
  query?: string
}

export function CompanyNetworkCard({ record, query }: CompanyNetworkCardProps) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  if (!record) {
    return (
      <div className="w-full rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground my-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-2 text-base font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            <Network className="size-4 text-amber-600 dark:text-amber-400" />
            <span>{lang === 'zh' ? '台灣公司關係網 · 商業司登記' : 'Taiwan Company Network'}</span>
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground">
          {lang === 'zh' ? '查無台灣商業司登記資料' : 'No Taiwan Company Record Found'}
        </h3>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed">
          {lang === 'zh'
            ? `在經濟部商業司公開登記索引中，未檢索到與「${query || '此公司'}」相符的台灣登記法人記錄。若為外國公司或美股標的，請使用即時新聞或基本面估值工具分析。`
            : `No matching Taiwanese registered business entity found for "${query || 'query'}". For foreign stocks, please use financial profile or news tools.`}
        </p>
        <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-base text-muted-foreground">
          <span>{lang === 'zh' ? '資料來源：888 台灣公司關係網' : 'Source: Taiwan Company Network'}</span>
          <a
            href="https://taiwan-company-network.david888.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            <span>{lang === 'zh' ? '造訪關係網首頁' : 'Visit Network Portal'}</span>
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    )
  }

  const upstreamCount = record.relationships.upstream.length
  const downstreamCount = record.relationships.downstream.length
  const totalAffiliates = upstreamCount + downstreamCount

  const safeWebUrl =
    record.webUrl && record.webUrl.startsWith('https://taiwan-company-network.david888.com')
      ? record.webUrl
      : `https://taiwan-company-network.david888.com/graph?company=${encodeURIComponent(record.name)}`

  return (
    <div className="w-full min-w-0 rounded-2xl border border-border/80 bg-card p-3.5 sm:p-7 shadow-xs text-card-foreground my-3 sm:my-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-border/60">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base font-semibold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 sm:px-3.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              <Network className="size-3.5 sm:size-4 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'zh' ? '台灣公司關係網 · 商業司登記' : 'Taiwan Company Network'}</span>
            </span>
            {record.stockCode && (
              <span className="inline-flex items-center gap-1 font-mono text-xs sm:text-base font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 sm:px-3.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <span>{record.market || 'TWSE'}:{record.stockCode}</span>
              </span>
            )}
            <span className="text-xs sm:text-base font-mono text-muted-foreground bg-muted px-2.5 sm:px-3 py-1 rounded-full border border-border/60">
              {lang === 'zh' ? `統編：${record.id}` : `Tax ID: ${record.id}`}
            </span>
          </div>

          <h3 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {record.name}
          </h3>
          <p className="text-xs sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
            {lang === 'zh'
              ? '依據經濟部商業司公開登記資料索引，即時彙整實收資本額、代表人、主要母股東與轉投資子公司群生態系。'
              : 'Official business registration summary and corporate affiliate network from Taiwan Company Network.'}
          </p>
        </div>

        {/* Interactive Graph CTA */}
        <a
          href={safeWebUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
          title={lang === 'zh' ? '前往台灣公司關係網檢視視覺化圖譜' : 'Open interactive graph'}
        >
          <GitFork className="size-3.5 sm:size-4" />
          <span>{lang === 'zh' ? '開啟互動關係圖譜' : 'Interactive Graph'}</span>
          <ArrowUpRight className="size-3.5 sm:size-4 opacity-90" />
        </a>
      </div>

      {/* Basic Registry Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-5">
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col justify-between gap-1.5">
          <div className="text-base text-muted-foreground font-semibold flex items-center gap-2">
            <Coins className="size-4 text-amber-500 shrink-0" />
            <span>{lang === 'zh' ? '實收資本額' : 'Capital'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
            {record.capitalFormatted}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col justify-between gap-1.5">
          <div className="text-base text-muted-foreground font-semibold flex items-center gap-2">
            <UserCheck className="size-4 text-indigo-500 shrink-0" />
            <span>{lang === 'zh' ? '代表人/董事長' : 'Representative'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {record.representative}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col justify-between gap-1.5">
          <div className="text-base text-muted-foreground font-semibold flex items-center gap-2">
            <Building2 className="size-4 text-sky-500 shrink-0" />
            <span>{lang === 'zh' ? '統一編號' : 'Tax ID'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
            {record.id}
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-col justify-between gap-1.5">
          <div className="text-base text-muted-foreground font-semibold flex items-center gap-2">
            <Network className="size-4 text-rose-500 shrink-0" />
            <span>{lang === 'zh' ? '關聯企業數' : 'Affiliates'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
            {totalAffiliates} {lang === 'zh' ? '家' : 'entities'}
          </div>
        </div>
      </div>

      {/* Address Line */}
      {record.address && record.address !== '—' && (
        <div className="flex items-center gap-2.5 text-base text-foreground mb-5 px-4 py-3 rounded-xl bg-muted/20 border border-border/70 leading-relaxed">
          <MapPin className="size-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-foreground shrink-0">{lang === 'zh' ? '登記地址：' : 'Address: '}</span>
          <span className="truncate">{record.address}</span>
        </div>
      )}

      {/* Corporate Relationship Sections */}
      <div className="space-y-5 pt-1">
        {/* Upstream Relationships (母公司 / 主要股東法人) */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full bg-sky-500" />
              <h4 className="text-lg sm:text-xl font-bold text-foreground">
                {lang === 'zh' ? '母公司 / 主要法人股東關係 (Upstream)' : 'Parent / Major Shareholder Entities'}
              </h4>
            </div>
            <span className="text-base font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground font-mono">
              {upstreamCount} {lang === 'zh' ? '家' : ''}
            </span>
          </div>

          {upstreamCount === 0 ? (
            <p className="text-base text-muted-foreground py-1 leading-relaxed">
              {lang === 'zh' ? '公開登記資料中無直接上層法人股東紀錄（可能為公眾分散持股或創辦人家族持股）。' : 'No direct upstream corporate entities recorded in public registry.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {record.relationships.upstream.map(affiliate => (
                <AffiliateChip key={affiliate.name} affiliate={affiliate} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* Downstream Relationships (轉投資事業 / 子公司群) */}
        <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full bg-indigo-500" />
              <h4 className="text-lg sm:text-xl font-bold text-foreground">
                {lang === 'zh' ? '轉投資事業 / 子公司群生態系 (Downstream)' : 'Subsidiaries & Investment Affiliates'}
              </h4>
            </div>
            <span className="text-base font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground font-mono">
              {downstreamCount} {lang === 'zh' ? '家' : ''}
            </span>
          </div>

          {downstreamCount === 0 ? (
            <p className="text-base text-muted-foreground py-1 leading-relaxed">
              {lang === 'zh' ? '公開登記資料中無直接轉投資事業紀錄。' : 'No direct downstream corporate entities recorded.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {record.relationships.downstream.map(affiliate => (
                <AffiliateChip key={affiliate.name} affiliate={affiliate} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer & Attribution */}
      <footer className="mt-6 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-base text-muted-foreground">
        <div className="flex items-center gap-2 leading-relaxed">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
          <span>
            {lang === 'zh'
              ? '資料來源：888 台灣公司關係網 (依經濟部商業司登記索引)，自然人姓名依法遮罩，股權關係為公開索引非即時法律控制權主張。'
              : 'Source: Taiwan Company Network. Registry index links do not represent verified current legal control.'}
          </span>
        </div>

        <a
          href={`/?q=${encodeURIComponent(
            lang === 'zh'
              ? `${record.name} (${record.stockCode || ''}) 核心集團轉投資與子公司綜合分析`
              : `Analyze corporate network and affiliates for ${record.name}`
          )}`}
          className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0"
        >
          <MessageSquare className="size-4" />
          <span>{lang === 'zh' ? '在 StockBot 分析此集團' : 'Analyze Group in Chat'}</span>
        </a>
      </footer>
    </div>
  )
}

function AffiliateChip({
  affiliate,
  lang
}: {
  affiliate: TaiwanCompanyAffiliate
  lang: 'zh' | 'en'
}) {
  const isListed = Boolean(affiliate.stockCode)

  if (isListed) {
    return (
      <a
        href={`/?q=${encodeURIComponent(
          lang === 'zh'
            ? `${affiliate.name} (${affiliate.stockCode}) 股票投資價值與關係人交易分析`
            : `Analyze ${affiliate.name} (${affiliate.stockCode})`
        )}`}
        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-base font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 transition-all shadow-2xs group cursor-pointer"
        title={lang === 'zh' ? `上市櫃公司：點擊在 StockBot 中深入分析 ${affiliate.name}` : `Listed stock: Analyze ${affiliate.name}`}
      >
        <span>{affiliate.name}</span>
        <span className="font-mono text-sm px-2 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-950 dark:text-emerald-50 font-bold">
          {affiliate.stockCode} · {affiliate.market || 'TWSE'}
        </span>
        <ChevronRight className="size-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
      </a>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium bg-muted/60 text-foreground border border-border/80 shadow-2xs"
      title={lang === 'zh' ? '未公開發行或未上市關係企業' : 'Unlisted corporate affiliate'}
    >
      <span>{affiliate.name}</span>
      <span className="text-sm font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted">
        {lang === 'zh' ? '未上市' : 'Unlisted'}
      </span>
    </span>
  )
}
