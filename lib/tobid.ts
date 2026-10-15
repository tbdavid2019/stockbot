import { findB2GEntity } from './tobid-entities.ts';
import type { B2GCompanyInfo } from './tobid-entities.ts';

export interface TopClient {
  unit: string;
  wins: number;
  amount: number;
}

export interface TopRival {
  name: string;
  met: number;
  this_vendor_wins: number;
  rival_wins: number;
}

export interface VendorReport {
  name: string;
  tax_id?: string;
  also_known_as?: string[];
  participations: number;
  wins: number;
  win_rate_pct: number;
  known_award_total: number;
  sole_bid_rate_pct: number;
  web?: string;
  top_clients: TopClient[];
  main_categories: Array<{ category: string; n: number }>;
  top_rivals: TopRival[];
}

export interface DebarmentEntry {
  unit_name?: string;
  title?: string;
  reason?: string;
  start_date?: string;
  end_date?: string;
  article?: string;
  note?: string;
}

export interface VendorCompliance {
  name: string;
  currently_debarred: boolean;
  debarments: DebarmentEntry[];
  revoked: Array<{ unit_name?: string; title?: string; note?: string }>;
  article_101_cases: Array<{ case_no?: string; title?: string; unit?: string; status?: string }>;
  web?: string;
  updated?: string;
}

export interface TenderItem {
  title: string;
  date: number | string;
  type: string;
  unit_name: string;
  unit_id?: string;
  job_number?: string;
  budget?: number;
  award_amount?: number;
  deadline?: string;
  winners?: string[];
}

export interface ProcurementForecast {
  total: number;
  forecasts_in_database: number;
  note?: string;
  items: Array<{
    title?: string;
    unit_name?: string;
    budget?: number;
    forecast_date?: string;
  }>;
  web?: string;
}

export interface GovProcurementResult {
  company: {
    symbol?: string;
    name: string;
    legalName: string;
    sectorLabel?: string;
  };
  report: VendorReport | null;
  compliance: VendorCompliance | null;
  recentTenders: TenderItem[];
  forecasts?: ProcurementForecast | null;
  isUnavailable?: boolean;
  fetchedAt: string;
  source: 'tobid.tw';
}

const TOBID_MCP_ENDPOINT = 'https://api.tobid.tw/mcp';
const DEFAULT_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// In-memory cache
const memoryCache = new Map<string, { data: any; expiry: number }>();

function getFromCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    memoryCache.delete(key);
    return null;
  }
  // Refresh recency for true LRU eviction
  memoryCache.delete(key);
  memoryCache.set(key, cached);
  return cached.data as T;
}

function setToCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  // If key already exists, delete first to move to the back
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  } else if (memoryCache.size >= 500) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, expiry: Date.now() + ttlMs });
}

// MCP session state
let mcpSessionInitialized = false;
let mcpSessionId: string | null = null;
let mcpInitPromise: Promise<void> | null = null;
let nextRpcId = 1000;

function getNextRpcId(): number {
  return nextRpcId++;
}

/**
 * 重設 MCP Session 狀態（當 session 過期或無效時使用）
 */
export function resetMcpSession(): void {
  mcpSessionInitialized = false;
  mcpSessionId = null;
  mcpInitPromise = null;
}

/**
 * 依據 MCP 規範在調用工具前完成 initialize 握手並保留 session
 */
export async function ensureMcpSession(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (mcpSessionInitialized) return;
  if (mcpInitPromise) return mcpInitPromise;

  mcpInitPromise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(TOBID_MCP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'stockbot',
              version: '1.0.0',
            },
          },
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        const sessionId =
          res.headers.get('mcp-session-id') ||
          res.headers.get('x-mcp-session-id');
        if (sessionId) mcpSessionId = sessionId;

        // Send MCP-required notifications/initialized notification to complete lifecycle under bounded timeout
        try {
          const initHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (mcpSessionId) {
            initHeaders['mcp-session-id'] = mcpSessionId;
          }
          await fetch(TOBID_MCP_ENDPOINT, {
            method: 'POST',
            headers: initHeaders,
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'notifications/initialized',
              params: {},
            }),
            signal: controller.signal,
          });
        } catch (notifErr) {
          console.warn(
            '[ToBid MCP] notifications/initialized non-blocking warning:',
            notifErr
          );
        }

        mcpSessionInitialized = true;
      } else {
        console.warn(`[ToBid MCP] Initialize returned HTTP ${res.status}`);
        resetMcpSession();
      }
    } catch (err) {
      console.warn(
        '[ToBid MCP] Initialize handshake failed, falling back to direct tool invocation:',
        err
      );
      resetMcpSession();
    } finally {
      clearTimeout(timer);
      mcpInitPromise = null;
    }
  })();

  return mcpInitPromise;
}

/**
 * 透過 JSON-RPC over Streamable-HTTP 調用 ToBid MCP 工具
 */
export async function callToBidTool<T>(
  toolName: string,
  args: Record<string, any>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  isRetry = false
): Promise<T | null> {
  const cacheKey = `${toolName}:${JSON.stringify(args)}`;
  const cached = getFromCache<T>(cacheKey);
  if (cached) return cached;

  await ensureMcpSession(timeoutMs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (mcpSessionId) {
      headers['mcp-session-id'] = mcpSessionId;
    }

    const res = await fetch(TOBID_MCP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: getNextRpcId(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[ToBid MCP] HTTP ${res.status} calling tool: ${toolName}`);
      // If server returns 400, 401, 403, 404, or 410 with an active session ID,
      // the remote session has likely expired or restarted.
      if (mcpSessionId && (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410)) {
        console.warn(`[ToBid MCP] Session ${mcpSessionId} invalid or expired (HTTP ${res.status}). Resetting session.`);
        resetMcpSession();
        if (!isRetry) {
          clearTimeout(timer);
          return callToBidTool<T>(toolName, args, timeoutMs, true);
        }
      }
      return null;
    }

    const responseSessionId =
      res.headers.get('mcp-session-id') ||
      res.headers.get('x-mcp-session-id');
    if (responseSessionId) mcpSessionId = responseSessionId;

    const json = await res.json();
    if (json.error) {
      console.warn(`[ToBid MCP] RPC error in ${toolName}:`, json.error);
      const isSessionRpcError =
        mcpSessionId &&
        (json.error.code === -32000 ||
          json.error.code === -32600 ||
          /session/i.test(json.error.message || ''));
      if (isSessionRpcError) {
        console.warn(`[ToBid MCP] Session RPC error encountered. Resetting session.`);
        resetMcpSession();
        if (!isRetry) {
          clearTimeout(timer);
          return callToBidTool<T>(toolName, args, timeoutMs, true);
        }
      }
      return null;
    }

    const textContent = json.result?.content?.[0]?.text;
    if (!textContent) return null;

    if (json.result?.isError) {
      console.warn(`[ToBid MCP] Tool error: ${textContent}`);
      return null;
    }

    const parsed = JSON.parse(textContent);
    setToCache(cacheKey, parsed);
    return parsed as T;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`[ToBid MCP] Request timed out after ${timeoutMs}ms for ${toolName}`);
    } else {
      console.warn(`[ToBid MCP] Request failed for ${toolName}:`, err?.message || err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 查詢廠商標案歷程、得標率、最大客戶與競爭對手
 */
export async function getVendorReport(legalName: string): Promise<VendorReport | null> {
  return callToBidTool<VendorReport>('vendor_report', { name: legalName });
}

/**
 * 查詢廠商《政府採購法》第101條停權合規紀錄（黑天鵝防核）
 */
export async function getVendorCompliance(legalName: string): Promise<VendorCompliance | null> {
  return callToBidTool<VendorCompliance>('vendor_compliance', { name: legalName });
}

/**
 * 搜尋標案公告紀錄
 */
export async function searchTenders(query: string, limit = 5): Promise<TenderItem[] | null> {
  const result = await callToBidTool<{ results?: TenderItem[] }>('search_tenders', {
    q: query,
    limit,
  });
  if (!result) return null;
  return result.results || [];
}

/**
 * 查詢採購預告（先行 1-3 個月招標預告）
 */
export async function getProcurementForecast(query: string, limit = 5): Promise<ProcurementForecast | null> {
  return callToBidTool<ProcurementForecast>('procurement_forecast', {
    q: query,
    limit,
  });
}

/**
 * 透過 ToBid 模糊搜尋法人/機關法定名稱
 */
export async function findEntity(query: string): Promise<string | null> {
  const result = await callToBidTool<{
    vendors?: Array<{ name: string; wins: number; records: number }>;
  }>('find_entity', { q: query });

  if (result?.vendors && result.vendors.length > 0) {
    return result.vendors[0].name;
  }
  return null;
}

/**
 * 取得公司全方位標案情報（含營收先行指標、對手對戰紀錄、第101條黑天鵝風控查核）
 */
export async function getCompanyProcurementIntelligence(
  queryOrSymbol: string
): Promise<GovProcurementResult | null> {
  const trimmed = queryOrSymbol?.trim();
  if (!trimmed) return null;

  // 1. 優先查本地高頻字典
  const b2gMatch = findB2GEntity(trimmed);

  let legalName = b2gMatch?.legalName || '';
  let displayName = b2gMatch?.name || trimmed;
  let symbol = b2gMatch?.symbol;
  let sectorLabel = b2gMatch?.sectorLabel;

  // 2. 若不在字典中，動態向 ToBid 查找正式名稱
  if (!legalName) {
    const dynamicEntity = await findEntity(trimmed);
    if (!dynamicEntity) {
      // 嘗試直接以輸入字串為 legalName
      legalName = trimmed;
    } else {
      legalName = dynamicEntity;
      displayName = dynamicEntity;
    }
  }

  // 3. 並行獲取 vendor_report, vendor_compliance, 與近期標案
  const [reportRes, complianceRes, tendersRes, forecastRes] = await Promise.allSettled([
    getVendorReport(legalName),
    getVendorCompliance(legalName),
    searchTenders(legalName, 6),
    getProcurementForecast(displayName || legalName, 3),
  ]);

  const report = reportRes.status === 'fulfilled' ? reportRes.value : null;
  const compliance = complianceRes.status === 'fulfilled' ? complianceRes.value : null;
  const tendersRaw = tendersRes.status === 'fulfilled' ? tendersRes.value : null;
  const forecasts = forecastRes.status === 'fulfilled' ? forecastRes.value : null;

  const isUnavailable = report === null && compliance === null && tendersRaw === null && forecasts === null;
  const recentTenders = tendersRaw || [];

  return {
    company: {
      symbol,
      name: displayName,
      legalName,
      sectorLabel,
    },
    report,
    compliance,
    recentTenders,
    forecasts,
    isUnavailable,
    fetchedAt: new Date().toISOString(),
    source: 'tobid.tw',
  };
}

/**
 * 處理無特定廠商/股票時的全市場公共標案與採購預告檢索
 */
export async function getGeneralProcurementIntelligence(
  keyword: string
): Promise<GovProcurementResult> {
  const cleanKeyword = keyword.trim() || '重大採購';
  const [tendersRes, forecastRes] = await Promise.allSettled([
    searchTenders(cleanKeyword, 8),
    getProcurementForecast(cleanKeyword, 4),
  ]);

  const tendersRaw = tendersRes.status === 'fulfilled' ? tendersRes.value : null;
  const forecasts = forecastRes.status === 'fulfilled' ? forecastRes.value : null;
  const isUnavailable = tendersRaw === null && forecasts === null;
  const recentTenders = tendersRaw || [];

  return {
    company: {
      name: `公共標案檢索：「${cleanKeyword}」`,
      legalName: `全市場政府電子採購公開資料：${cleanKeyword}`,
      sectorLabel: '全市場標案檢索',
    },
    report: null,
    compliance: null,
    recentTenders,
    forecasts,
    isUnavailable,
    fetchedAt: new Date().toISOString(),
    source: 'tobid.tw',
  };
}

