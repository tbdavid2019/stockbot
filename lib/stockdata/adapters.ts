import { boundResult, stockdataGet, stockdataPost } from './client'
import { tickerPathSegment } from './normalization'
import { isRecord, recordString, type StockdataResult } from './types'

export type StockdataQuery = { indexName?: string; limit?: number; ticker?: string; query?: string; tickers?: string[] }

export function fetchPredictionRanking(kind: 'resonance' | 'xuantie' | 'lstm-bullish' | 'lstm-bearish' | 'timesfm-bullish' | 'timesfm-bearish', query: StockdataQuery = {}) {
  const path = {
    resonance: '/api/v1/predictions/resonance',
    xuantie: '/api/v1/predictions/xuantie',
    'lstm-bullish': '/api/v1/predictions/lstm/top-bullish',
    'lstm-bearish': '/api/v1/predictions/lstm/top-bearish',
    'timesfm-bullish': '/api/v1/predictions/timesfm/top-bullish',
    'timesfm-bearish': '/api/v1/predictions/timesfm/top-bearish'
  }[kind]
  return stockdataGet(path, { domain: 'predictions', query: { index_name: query.indexName, limit: query.limit || 10 } }).then(result => boundResult(result))
}

export const fetchLatestPredictions = (query: StockdataQuery = {}) => stockdataGet('/api/v1/predictions/latest', { domain: 'predictions', query: { index_name: query.indexName, limit: query.limit || 10 } }).then(result => boundResult(result))

export const fetchPredictionHistory = (ticker: string) => stockdataGet(`/api/v1/predictions/history/${tickerPathSegment(ticker)}`, { domain: 'predictions' }).then(result => boundResult(result))

export const resolvePredictionTicker = (query: string) => stockdataGet(`/api/v1/predictions/resolve/${encodeURIComponent(query.trim())}`, { domain: 'predictions', cache: false })

export function fetchBrokerData(kind: 'summary' | 'trades' | 'trend', ticker: string) {
  return stockdataGet(`/api/v1/market/broker/${kind}/${tickerPathSegment(ticker)}`, { domain: 'market' }).then(result => boundResult(result))
}

export const fetchInstitutionalLeaderboard = (query: StockdataQuery & { direction?: 'buy' | 'sell' | 'all' } = {}) => stockdataGet('/api/v1/market/institutional/top', { domain: 'market', query: { market: query.indexName, limit: query.limit || 15, sort_dir: query.direction === 'sell' ? 'asc' : 'desc' } }).then(result => boundResult(result))

export const fetchCompanyProfile = (ticker?: string, query?: string) => stockdataGet(ticker ? `/api/v1/market/company-profile/${tickerPathSegment(ticker)}` : '/api/v1/market/company-profile', { domain: 'market', query: ticker ? undefined : { ticker, query } }).then(result => boundResult(result))

export const fetchCompanyProfiles = (query: StockdataQuery = {}) => stockdataGet('/api/v1/market/company-profiles', { domain: 'market', query: { tickers: query.tickers?.join(',') || query.query } }).then(result => boundResult(result))

export const fetchCompanyProfilesBatch = (tickers: string[]) => stockdataPost('/api/v1/market/company-profiles/batch', { tickers: tickers.slice(0, 15) }, { domain: 'market', query: { tickers: tickers.slice(0, 15).join(',') } }).then(result => boundResult(result))

export type MacroDataset = 'latest' | 'summary' | 'fed-rate' | 'earnings-calendar' | 'economic-calendar' | 'commodities' | 'polymarket'

export const fetchMacroDataset = (kind: MacroDataset, query: { market?: string; category?: string } = {}) => {
  const path: Record<MacroDataset, string> = {
    latest: '/api/v1/macro/latest',
    summary: '/api/v1/macro/investing/summary',
    'fed-rate': '/api/v1/macro/investing/fed-rate',
    'earnings-calendar': '/api/v1/macro/investing/earnings-calendar',
    'economic-calendar': '/api/v1/macro/investing/economic-calendar',
    commodities: '/api/v1/macro/investing/commodities',
    polymarket: '/api/v1/macro/polymarket/sentiment'
  }
  return stockdataGet(path[kind], {
    domain: 'macro',
    query:
      kind === 'latest'
        ? { market: query.market }
        : kind === 'polymarket'
          ? { category: query.category }
          : undefined
  }).then(result => boundResult(result))
}

export type DiscoveryDocument = { endpoint: string; ok: boolean; valid: boolean; version?: string; transport?: string; supportedEndpoints?: string[]; tools?: string[]; error?: string }

function validateDiscoveryDocument(endpoint: string, data: unknown): Omit<DiscoveryDocument, 'endpoint' | 'ok' | 'error'> {
  if (!isRecord(data)) return { valid: false }
  if (endpoint === '/openapi.json') {
    const paths = isRecord(data.paths) ? Object.keys(data.paths).slice(0, 60) : []
    const info = isRecord(data.info) ? data.info : undefined
    return { valid: typeof data.openapi === 'string' && paths.length > 0, version: recordString(info, 'version') || recordString(data, 'openapi'), supportedEndpoints: paths }
  }
  if (endpoint.includes('mcp')) {
    const tools = Array.isArray(data.tools) ? data.tools.map(item => typeof item === 'string' ? item : isRecord(item) ? recordString(item, 'name') : undefined).filter((item): item is string => Boolean(item)).slice(0, 40) : []
    return { valid: Boolean(recordString(data, 'version')) && tools.length > 0, version: recordString(data, 'version'), transport: recordString(data, 'transport'), tools }
  }
  if (endpoint.includes('ai-plugin')) {
    const api = isRecord(data.api) ? data.api : undefined
    return { valid: Boolean(recordString(data, 'schema_version')) && Boolean(api && recordString(api, 'url')), version: recordString(data, 'schema_version') }
  }
  return { valid: Boolean(data.success !== false), version: recordString(data, 'version') }
}

export async function fetchDiscoveryDiagnostics(): Promise<StockdataResult<{ documents: DiscoveryDocument[] }>> {
  const paths = ['/health', '/openapi.json', '/.well-known/mcp.json', '/.well-known/ai-plugin.json', '/mcp.json']
  const results = await Promise.all(paths.map(async endpoint => {
    const result = await stockdataGet(endpoint, { domain: 'discovery', cache: false })
    const validation = validateDiscoveryDocument(endpoint, result.data)
    return { endpoint, ok: result.status !== 'unavailable', ...validation, error: result.warnings[0] }
  }))
  const failed = results.filter(item => !item.ok || !item.valid).length
  return {
    data: { documents: results },
    source: { provider: 'stockdata.david888.com', url: 'https://stockdata.david888.com', fetchedAt: new Date().toISOString(), endpoint: 'discovery' },
    status: failed === results.length ? 'unavailable' : failed ? 'partial' : 'live',
    warnings: failed ? [`${failed} 個 discovery endpoint 無法取得。`] : []
  }
}
