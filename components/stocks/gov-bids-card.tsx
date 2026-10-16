'use client';

import * as React from 'react';
import type { GovProcurementResult, TenderItem, TopClient, TopRival } from '@/lib/tobid';
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  Trophy,
  Swords,
  TrendingUp,
  FileText,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Landmark,
  BadgeAlert,
  AlertTriangle,
  Coins
} from 'lucide-react';

export interface GovBidsCardProps {
  data: GovProcurementResult;
  standalone?: boolean;
}

function formatAmount(amount?: number): string {
  if (!amount || isNaN(amount)) return 'NT$ 0';
  if (amount >= 100_000_000_000) {
    return `NT$ ${(amount / 100_000_000).toFixed(0)} 億`;
  }
  if (amount >= 100_000_000) {
    return `NT$ ${(amount / 100_000_000).toFixed(2)} 億`;
  }
  if (amount >= 10_000) {
    return `NT$ ${(amount / 10_000).toFixed(0)} 萬`;
  }
  return `NT$ ${amount.toLocaleString()}`;
}

export function GovBidsCard({ data, standalone = false }: GovBidsCardProps) {
  const { company, report, compliance, recentTenders, forecasts } = data;
  const [activeTab, setActiveTab] = React.useState<'overview' | 'clients' | 'rivals' | 'tenders' | 'forecasts'>(
    report ? 'overview' : (recentTenders?.length > 0 ? 'tenders' : (forecasts?.items?.length ? 'forecasts' : 'tenders'))
  );
  const [showDebarmentDetails, setShowDebarmentDetails] = React.useState(false);

  const complianceStatus: 'debarred' | 'clean' | 'unknown' =
    typeof compliance?.currently_debarred === 'boolean'
      ? compliance.currently_debarred
        ? 'debarred'
        : 'clean'
      : 'unknown';

  const isDebarred = complianceStatus === 'debarred';

  const [agencyFilter, setAgencyFilter] = React.useState<string>('all');
  const [timeframeFilter, setTimeframeFilter] = React.useState<'all' | '1y' | '2y'>('all');

  const availableAgencies = React.useMemo(() => {
    if (!recentTenders || recentTenders.length === 0) return [];
    const set = new Set<string>();
    for (const t of recentTenders) {
      if (t.unit_name) set.add(t.unit_name);
    }
    return Array.from(set);
  }, [recentTenders]);

  const filteredTenders = React.useMemo(() => {
    if (!recentTenders) return [];
    return recentTenders.filter(t => {
      if (agencyFilter !== 'all' && t.unit_name !== agencyFilter) {
        return false;
      }
      if (timeframeFilter !== 'all') {
        const rawDateStr = String(t.date || '').trim();
        const yearMatch = rawDateStr.match(/(?:19|20)\d{2}/);
        const tenderYear = yearMatch ? parseInt(yearMatch[0], 10) : new Date(rawDateStr).getFullYear();
        const currentYear = new Date().getFullYear();
        if (!isNaN(tenderYear)) {
          if (timeframeFilter === '1y' && currentYear - tenderYear > 1) return false;
          if (timeframeFilter === '2y' && currentYear - tenderYear > 2) return false;
        }
      }
      return true;
    });
  }, [recentTenders, agencyFilter, timeframeFilter]);

  return (
    <div className="w-full my-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden text-zinc-900 dark:text-zinc-100 transition-all">
      {data.isUnavailable && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span>⚠️ ToBid 政府採購公開情報服務暫時無法連線或逾時，請稍候再試。</span>
        </div>
      )}
      {/* 1. Header Section */}
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold text-lg border border-blue-200 dark:border-blue-900">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                {company.name} {company.symbol ? `(${company.symbol})` : ''}
              </h3>
              {company.sectorLabel && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700">
                  {company.sectorLabel}
                </span>
              )}
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                {report ? '政府標案先行指標' : '標案檢索'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
              {company.legalName} • 資料源：ToBid / 行政院公共工程委員會
            </p>
          </div>
        </div>

        {/* Article 101 Compliance Badge */}
        {company.symbol || report ? (
          <div>
            {complianceStatus === 'debarred' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold animate-pulse">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>採購法第 101 條停權列管中</span>
              </div>
            ) : complianceStatus === 'clean' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>投標資格：正常合規</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                <ShieldAlert className="w-4 h-4 text-zinc-500" />
                <span>投標資格：待連線核實</span>
              </div>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium">
            <span>全市場公告搜尋</span>
          </div>
        )}
      </div>

      {/* 2. Red Alert Warning Banner if Debarred */}
      {isDebarred && (
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/60 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 dark:text-red-200 space-y-1">
              <p className="font-bold text-sm text-red-700 dark:text-red-300">
                🚨 重大風控警報：該公司已被刊登為政府採購拒絕往來廠商
              </p>
              <p>
                依據《政府採購法》第 101 條至 103 條規定，於停權期間不得參與任何公共工程投標。此為重大利空，將實質衝擊公部門營收訂單。
              </p>
              {compliance?.debarments && compliance.debarments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-900/50 text-xs font-mono space-y-1">
                  {compliance.debarments.map((d, idx) => (
                    <div key={idx} className="bg-white/60 dark:bg-zinc-900/60 p-2 rounded border border-red-200/60 dark:border-red-900/30">
                      <div>機關：{d.unit_name || '公共工程委員會'}</div>
                      <div>案件：{d.title || d.reason || '採購法處分'}</div>
                      <div>期間：{d.start_date || '即日'} 至 {d.end_date || '未定'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Core Metric Cards */}
      {report ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>累積得標總額</span>
            </div>
            <div className="text-lg sm:text-xl font-bold mt-1 text-zinc-900 dark:text-zinc-50 tracking-tight">
              {formatAmount(report.known_award_total)}
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              歷史決標公開統計
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-500" />
              <span>歷史勝率</span>
            </div>
            <div className="text-lg sm:text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 tracking-tight">
              {report.win_rate_pct?.toFixed(1)}%
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              得標 {report.wins?.toLocaleString()} / 投標 {report.participations?.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>單一投標得標率</span>
            </div>
            <div className="text-lg sm:text-xl font-bold mt-1 text-zinc-900 dark:text-zinc-50 tracking-tight">
              {report.sole_bid_rate_pct?.toFixed(1)}%
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              無競爭者獨得比率
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-100 dark:border-zinc-800/80">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-purple-500" />
              <span>主要競爭對手</span>
            </div>
            <div className="text-sm sm:text-base font-bold mt-1 text-zinc-900 dark:text-zinc-100 truncate">
              {report.top_rivals?.[0]?.name ? report.top_rivals[0].name.replace(/股份有限公司|有限公司/, '') : '無顯著競爭'}
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {report.top_rivals?.[0]
                ? `交手 ${report.top_rivals[0].met} 次 (${report.top_rivals[0].this_vendor_wins}勝 vs ${report.top_rivals[0].rival_wins}負)`
                : '獨家專營優勢'}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
          <span>全市場檢索模式：下方為關鍵字即時檢索之最新政府公告、決標標案與採購預告紀錄。</span>
        </div>
      )}

      {/* 4. Tab Navigation */}
      <div>
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 gap-3 sm:gap-4 text-xs sm:text-sm font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
          {report && (
            <>
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2.5 sm:py-3 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                前五大發包客戶 ({report.top_clients?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('rivals')}
                className={`py-2.5 sm:py-3 border-b-2 transition-colors shrink-0 ${
                  activeTab === 'rivals'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                同場對手戰績 ({report.top_rivals?.length || 0})
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('tenders')}
            className={`py-2.5 sm:py-3 border-b-2 transition-colors shrink-0 ${
              activeTab === 'tenders'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            標案決標與公告 ({recentTenders?.length || 0})
          </button>
          {forecasts?.items && forecasts.items.length > 0 && (
            <button
              onClick={() => setActiveTab('forecasts')}
              className={`py-2.5 sm:py-3 border-b-2 transition-colors shrink-0 ${
                activeTab === 'forecasts'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              未來採購預告 ({forecasts.items.length})
            </button>
          )}
        </div>

          {/* 5. Tab Content */}
          <div className="p-4 sm:p-5">
            {/* Tab 1: Top Clients */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                  前五大發包機關集中度與金額佔比
                </div>
                {report && report.top_clients && report.top_clients.length > 0 ? (
                  report.top_clients.slice(0, 5).map((client, idx) => {
                    const knownTotal = report.known_award_total || 0;
                    const pct = knownTotal > 0
                      ? Math.min(100, Math.round((client.amount / knownTotal) * 100))
                      : 0;
                    return (
                      <div key={idx} className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
                        <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            {client.unit}
                          </span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-300 font-semibold">
                            {formatAmount(client.amount)} ({client.wins} 案)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-400">暫無客戶機關詳細資料</p>
                )}
              </div>
            )}

            {/* Tab 2: Competitors */}
            {activeTab === 'rivals' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                  核心競爭同業同場對決勝負紀錄
                </div>
                {report && report.top_rivals && report.top_rivals.length > 0 ? (
                  report.top_rivals.slice(0, 6).map((rival, idx) => {
                    const totalWins = (rival.this_vendor_wins || 0) + (rival.rival_wins || 0);
                    const winPct = totalWins > 0 ? Math.round((rival.this_vendor_wins / totalWins) * 100) : 50;
                    return (
                      <div key={idx} className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
                        <div className="flex justify-between items-center text-xs sm:text-sm mb-1.5">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {rival.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            同場 {rival.met} 次
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 mb-1">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {company.name} {rival.this_vendor_wins} 勝 ({winPct}%)
                          </span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">
                            對手 {rival.rival_wins} 勝
                          </span>
                        </div>
                        <div className="w-full bg-rose-200 dark:bg-rose-950 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 dark:bg-emerald-400 h-full"
                            style={{ width: `${winPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-400">在政府標案中無高頻競爭對手交手紀錄。</p>
                )}
              </div>
            )}

            {/* Tab 3: Recent Tenders */}
            {activeTab === 'tenders' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    近期公告與重大決標紀錄 ({filteredTenders.length} / {recentTenders?.length || 0})
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    {/* 機關篩選 */}
                    {availableAgencies.length > 1 && (
                      <select
                        value={agencyFilter}
                        onChange={e => setAgencyFilter(e.target.value)}
                        className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs focus:outline-none"
                      >
                        <option value="all">所有機關 ({recentTenders.length})</option>
                        {availableAgencies.map((agency, i) => (
                          <option key={i} value={agency}>
                            {agency}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* 期間篩選 */}
                    <div className="inline-flex rounded-md border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-100 dark:bg-zinc-800 text-[11px]">
                      <button
                        onClick={() => setTimeframeFilter('all')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          timeframeFilter === 'all'
                            ? 'bg-white dark:bg-zinc-900 font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        全部
                      </button>
                      <button
                        onClick={() => setTimeframeFilter('1y')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          timeframeFilter === '1y'
                            ? 'bg-white dark:bg-zinc-900 font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        近1年
                      </button>
                      <button
                        onClick={() => setTimeframeFilter('2y')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          timeframeFilter === '2y'
                            ? 'bg-white dark:bg-zinc-900 font-semibold text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        近2年
                      </button>
                    </div>
                  </div>
                </div>

                {filteredTenders && filteredTenders.length > 0 ? (
                  filteredTenders.map((tender, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {tender.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                          <span>{tender.unit_name}</span>
                          <span>•</span>
                          <span>{String(tender.date)}</span>
                          {tender.type && (
                            <span className="px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-[10px]">
                              {tender.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-xs sm:text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                          {tender.award_amount ? formatAmount(tender.award_amount) : (tender.budget ? `預算 ${formatAmount(tender.budget)}` : '未揭露')}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400">
                    {recentTenders && recentTenders.length > 0
                      ? '在目前篩選條件下無符合的標案紀錄。'
                      : '近期暫無標案決標紀錄。'}
                  </p>
                )}
              </div>
            )}

            {/* Tab 4: Procurement Forecasts */}
            {activeTab === 'forecasts' && (
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 flex items-center justify-between">
                  <span>未來採購預告（機關公開預算案）</span>
                  {forecasts?.total ? (
                    <span className="text-[11px] text-zinc-400">
                      資料庫共收錄 {forecasts.total} 案
                    </span>
                  ) : null}
                </div>
                {forecasts?.items && forecasts.items.length > 0 ? (
                  forecasts.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {item.title || '採購預告項目'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                          {item.unit_name && <span>{item.unit_name}</span>}
                          {item.unit_name && item.forecast_date && <span>•</span>}
                          {item.forecast_date && <span>預計公告：{item.forecast_date}</span>}
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.budget ? `預估預算 ${formatAmount(item.budget)}` : '未揭露預算'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400">目前暫無未來採購預告資料。</p>
                )}
              </div>
            )}
          </div>
        </div>

      {/* 6. Footer External Link */}
      <div className="px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 flex items-center justify-between text-xs text-zinc-500">
        <span>ToBid 台灣政府電子採購公開情報</span>
        {report?.web && (
          <a
            href={report.web}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
          >
            <span>在 ToBid 查看完整 14M+ 履約資料</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
