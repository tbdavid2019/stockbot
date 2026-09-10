import 'server-only'

import {
  STOCKDATA_PROVIDER,
  type StockdataRecord,
  type StockdataResult,
  type StockdataStatus,
  jsonSafe
} from './types'

const DEFAULT_BASE_URL = 'https://stockdata.david888.com'
const DEFAULT_TIMEOUTS = {
  predictions: 5000,
  market: 5500,
  macro: 7500,
  discovery: 3500
} as const
const CACHE_TTL_MS = 60_000
const CIRCUIT_FAILURE_LIMIT = 2
const CIRCUIT_COOLDOWN_MS = 30_000
const MAX_ARRAY_ITEMS = 15
const MAX_TEXT_LENGTH = 1500

type Domain = keyof typeof DEFAULT_TIMEOUTS
type CacheEntry = { expiresAt: number; result: StockdataResult<unknown> }
type BreakerState = { failures: number; cooldownUntil: number }

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<StockdataResult<unknown>>>()
const breakers = new Map<string, BreakerState>()

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 250 ? value : fallback
}

function envFlag(name: string, fallback = true) {
  const value = process.env[name]
  return value === undefined ? fallback : !['0', 'false', 'off'].includes(value.toLowerCase())
}

function domainForPath(path: string): Domain {
  if (path.startsWith('/api/v1/predictions')) return 'predictions'
  if (path.startsWith('/api/v1/macro')) return 'macro'
  if (path.startsWith('/api/v1/market')) return 'market'
  return 'discovery'
}

function timeoutFor(domain: Domain) {
  return envNumber(`STOCKDATA_${domain.toUpperCase()}_TIMEOUT_MS`, DEFAULT_TIMEOUTS[domain])
}

function enabledFor(domain: Domain) {
  if (!envFlag('STOCKDATA_ENABLED', true)) return false
  return envFlag(`STOCKDATA_${domain.toUpperCase()}_ENABLED`, true)
}

function configuredBaseUrl() {
  const candidate = process.env.STOCKDATA_BASE_URL || DEFAULT_BASE_URL
  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function sourceFor(url: string, path: string, fetchedAt = new Date().toISOString()) {
  return { provider: STOCKDATA_PROVIDER, url, fetchedAt, endpoint: path } as const
}

function unavailable<T>(path: string, warning: string): StockdataResult<T> {
  const base = configuredBaseUrl() || DEFAULT_BASE_URL
  const url = `${base}${path}`
  return {
    source: sourceFor(url, path),
    status: 'unavailable',
    warnings: [warning]
  }
}

function sanitizePayload(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}…` : value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'object') return value
  if (depth > 8) return null
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map(item => sanitizePayload(item, depth + 1))
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizePayload(item, depth + 1)]))
}

function markFailure(key: string) {
  const current = breakers.get(key) || { failures: 0, cooldownUntil: 0 }
  current.failures += 1
  if (current.failures >= CIRCUIT_FAILURE_LIMIT) current.cooldownUntil = Date.now() + CIRCUIT_COOLDOWN_MS
  breakers.set(key, current)
}

function markSuccess(key: string) {
  breakers.delete(key)
}

function isCircuitOpen(key: string) {
  const current = breakers.get(key)
  if (!current) return false
  if (current.cooldownUntil && current.cooldownUntil > Date.now()) return true
  if (current.cooldownUntil) breakers.delete(key)
  return false
}

function queryString(query?: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

async function request<T>(
  path: string,
  options: { domain?: Domain; query?: Record<string, string | number | boolean | undefined>; cache?: boolean; method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<StockdataResult<T>> {
  const domain = options.domain || domainForPath(path)
  const suffix = queryString(options.query)
  const base = configuredBaseUrl()
  if (!base) return unavailable(path, 'Stockdata provider URL is invalid or unavailable.')
  if (!enabledFor(domain)) return unavailable(path, `Stockdata ${domain} integration is disabled.`)

  const url = `${base}${path}${suffix}`
  const method = options.method || 'GET'
  const serializedBody = options.body === undefined ? '' : JSON.stringify(options.body)
  const key = `${domain}:${method}:${url}:${serializedBody}`
  const useCache = options.cache !== false
  const cached = cache.get(key)
  if (useCache && cached && cached.expiresAt > Date.now()) {
    const cachedResult = cached.result as StockdataResult<T>
    return {
      ...cachedResult,
      status:
        cachedResult.status === 'unavailable' || cachedResult.status === 'stale' || cachedResult.status === 'partial'
          ? cachedResult.status
          : 'cached'
    }
  }
  if (isCircuitOpen(key)) return unavailable(path, 'Stockdata circuit breaker is cooling down after repeated failures.')
  const running = inFlight.get(key)
  if (running) return (await running) as StockdataResult<T>

  const promise = (async (): Promise<StockdataResult<unknown>> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutFor(domain))
    const fetchedAt = new Date().toISOString()
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (options.body !== undefined) headers['Content-Type'] = 'application/json'
      if (process.env.STOCKDATA_API_KEY) headers.Authorization = `Bearer ${process.env.STOCKDATA_API_KEY}`
      const response = await fetch(url, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const raw = (await response.json()) as unknown
      const safe = sanitizePayload(raw) as T
      const rawRecord = safe && typeof safe === 'object' && !Array.isArray(safe) ? (safe as StockdataRecord) : undefined
      const stale = rawRecord?.is_stale === true || rawRecord?.status === 'stale'
      const warningValues = Array.isArray(rawRecord?.warnings) ? rawRecord.warnings.filter((item): item is string => typeof item === 'string') : []
      const result: StockdataResult<T> = {
        data: safe,
        source: {
          ...sourceFor(url, path, fetchedAt),
          asOf:
            typeof rawRecord?.data_as_of === 'string'
              ? rawRecord.data_as_of
              : typeof rawRecord?.timestamp === 'string'
                ? rawRecord.timestamp
                : typeof rawRecord?.latest_batch_timestamp === 'string'
                  ? rawRecord.latest_batch_timestamp
                  : typeof rawRecord?.batch_date === 'string'
                    ? rawRecord.batch_date
                    : undefined
        },
        status: stale ? 'stale' : warningValues.length ? 'partial' : 'live',
        warnings: warningValues
      }
      markSuccess(key)
      if (useCache) cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result: jsonSafe(result) })
      return result
    } catch (error) {
      markFailure(key)
      return unavailable<T>(path, `Stockdata request failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      clearTimeout(timer)
    }
  })()
  inFlight.set(key, promise)
  try {
    return (await promise) as StockdataResult<T>
  } finally {
    inFlight.delete(key)
  }
}

export const stockdataGet = request

export function stockdataPost<T>(path: string, body: unknown, options: { domain?: Domain; query?: Record<string, string | number | boolean | undefined>; cache?: boolean } = {}) {
  return request<T>(path, { ...options, method: 'POST', body })
}

export function boundResult<T>(result: StockdataResult<T>, max = MAX_ARRAY_ITEMS): StockdataResult<T> {
  if (!result.data || typeof result.data !== 'object') return result
  if (Array.isArray(result.data) && result.data.length > max) {
    return {
      ...result,
      data: result.data.slice(0, max) as T,
      warnings: [...result.warnings, `結果已限制為前 ${max} 筆。`],
      status: result.status === 'live' ? 'partial' : result.status
    }
  }
  const data = result.data as StockdataRecord
  const rowsKey = ['data', 'items', 'results'].find(key => Array.isArray(data[key]))
  if (!rowsKey || !Array.isArray(data[rowsKey]) || data[rowsKey].length <= max) return result
  return {
    ...result,
    data: { ...data, [rowsKey]: data[rowsKey].slice(0, max), count: data.count ?? data[rowsKey].length } as T,
    warnings: [...result.warnings, `結果已限制為前 ${max} 筆，保留 provider count 與查詢條件。`],
    status: result.status === 'live' ? 'partial' : result.status
  }
}
