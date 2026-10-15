/**
 * 888 Taiwan Company Network API Client & Intelligence SDK
 * Endpoint: https://taiwan-company-network.david888.com/api/v1/
 * Documentation: https://taiwan-company-network.david888.com/skill
 */

export interface TaiwanCompanyAffiliate {
  name: string
  stockCode?: string
  market?: string
}

export interface TaiwanCompanyRecord {
  name: string
  id: string // 統一編號 (Tax ID / Business Registration Number)
  capital: number // 資本額 (NTD)
  capitalFormatted: string // e.g. "2,805 億元" or "8,000 萬元"
  representative: string // 代表人 / 董事長 (masked for privacy, e.g. "魏_家")
  address: string // 登記地址
  aliases: Array<{ code: string; market: string }>
  stockCode?: string // e.g. "2330"
  market?: string // e.g. "TWSE"
  relationships: {
    upstream: TaiwanCompanyAffiliate[]
    downstream: TaiwanCompanyAffiliate[]
  }
  webUrl: string // Interactive Graph link
}

interface NetworkIndex {
  version: string
  aliases: string
  companyShards: Record<string, string>
}

interface NetworkAliases {
  aliases: Record<string, Array<{ name: string; code?: string; market?: string }>>
}

interface RawCompanyRecord {
  name: string
  id: string
  capital: number
  representative: string
  address: string
  aliases?: Array<{ code: string; market: string }>
  relationships?: {
    upstream?: string[]
    downstream?: string[]
  }
  webUrl?: string
}

const TCN_API_BASE = 'https://taiwan-company-network.david888.com/api/v1'

// Cache configuration
let cachedIndex: { data: NetworkIndex; expiresAt: number } | null = null
let cachedAliases: { aliases: NetworkAliases; nameToStock: Map<string, { code: string; market: string }>; expiresAt: number } | null = null
const shardCache = new Map<string, { data: Record<string, RawCompanyRecord>; expiresAt: number }>()
const companyCache = new Map<string, { data: TaiwanCompanyRecord; expiresAt: number }>()

const CACHE_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours for static CDN data

/**
 * Formats capital number into readable Taiwanese currency units (億 / 萬)
 */
export function formatTaiwanCapital(capital: number): string {
  if (!capital || isNaN(capital)) return '未公開'
  if (capital >= 100_000_000) {
    const yi = capital / 100_000_000
    const str = yi % 1 === 0 ? yi.toLocaleString('en-US') : yi.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `${str} 億元`
  }
  if (capital >= 10_000) {
    const wan = capital / 10_000
    const str = wan % 1 === 0 ? wan.toLocaleString('en-US') : wan.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    return `${str} 萬元`
  }
  return `${capital.toLocaleString('en-US')} 元`
}

/**
 * Fetches and caches the root index.json
 */
async function getIndex(): Promise<NetworkIndex | null> {
  const now = Date.now()
  if (cachedIndex && cachedIndex.expiresAt > now) {
    return cachedIndex.data
  }

  try {
    const res = await fetch(`${TCN_API_BASE}/index.json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return null
    const json = (await res.json()) as NetworkIndex
    cachedIndex = {
      data: json,
      expiresAt: now + CACHE_TTL_MS
    }
    return json
  } catch (err) {
    console.warn('[TaiwanCompanyNetwork] Failed to fetch index.json:', err)
    return cachedIndex ? cachedIndex.data : null
  }
}

/**
 * Fetches and caches aliases.json and builds reverse name-to-stock mapping
 */
async function getAliases(): Promise<{
  aliases: NetworkAliases
  nameToStock: Map<string, { code: string; market: string }>
} | null> {
  const now = Date.now()
  if (cachedAliases && cachedAliases.expiresAt > now) {
    return cachedAliases
  }

  try {
    const res = await fetch(`${TCN_API_BASE}/aliases.json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return null
    const json = (await res.json()) as NetworkAliases

    const nameToStock = new Map<string, { code: string; market: string }>()
    if (json.aliases) {
      for (const items of Object.values(json.aliases)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.name && item.code && !nameToStock.has(item.name)) {
              nameToStock.set(item.name, { code: item.code, market: item.market || 'TWSE' })
            }
          }
        }
      }
    }

    cachedAliases = {
      aliases: json,
      nameToStock,
      expiresAt: now + CACHE_TTL_MS
    }
    return cachedAliases
  } catch (err) {
    console.warn('[TaiwanCompanyNetwork] Failed to fetch aliases.json:', err)
    return cachedAliases ? cachedAliases : null
  }
}

/**
 * Fetches a single company shard by first character
 */
async function getCompanyShard(firstChar: string, index: NetworkIndex): Promise<Record<string, RawCompanyRecord> | null> {
  const shardRel = index.companyShards?.[firstChar]
  if (!shardRel) return null

  const now = Date.now()
  const cached = shardCache.get(shardRel)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  try {
    const res = await fetch(`${TCN_API_BASE}/${shardRel}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return null
    const json = await res.json()
    const shardData = (json.data || {}) as Record<string, RawCompanyRecord>

    // Limit cache size to prevent memory bloat
    if (shardCache.size > 150) {
      const oldestKey = shardCache.keys().next().value
      if (oldestKey) shardCache.delete(oldestKey)
    }

    shardCache.set(shardRel, {
      data: shardData,
      expiresAt: now + CACHE_TTL_MS
    })
    return shardData
  } catch (err) {
    console.warn(`[TaiwanCompanyNetwork] Failed to fetch shard ${shardRel}:`, err)
    return null
  }
}

/**
 * Normalizes input query (e.g. "2330.TW", "TWSE:2330", "台積電", "台灣積體電路製造股份有限公司")
 */
function cleanQuery(query: string): string {
  return query
    .trim()
    .toUpperCase()
    .replace(/^(?:TWSE|TPEX|ROCOTC):/i, '')
    .replace(/\.(?:TW|TWO)$/i, '')
    .trim()
}

/**
 * Resolves a company record by ticker, short name, or registered name
 */
export async function lookupTaiwanCompany(rawQuery: string): Promise<TaiwanCompanyRecord | null> {
  if (!rawQuery || typeof rawQuery !== 'string') return null
  const cleaned = cleanQuery(rawQuery)
  if (!cleaned) return null

  // Check in-memory company cache
  const now = Date.now()
  const cached = companyCache.get(cleaned)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const [index, aliasesData] = await Promise.all([getIndex(), getAliases()])
  if (!index || !aliasesData) return null

  const { aliases: aliasesJson, nameToStock } = aliasesData
  const aliases = aliasesJson.aliases || {}

  // 1. Resolve registered name from aliases mapping
  let registeredName: string | null = null
  let matchedStockCode: string | undefined
  let matchedMarket: string | undefined

  // Check direct alias match (ticker code e.g. "2330", or short name e.g. "台積電")
  const aliasEntry = aliases[cleaned] || aliases[rawQuery.trim()]
  if (aliasEntry && aliasEntry.length > 0) {
    registeredName = aliasEntry[0].name
    matchedStockCode = aliasEntry[0].code
    matchedMarket = aliasEntry[0].market
  }

  // 2. If no alias match, check if cleaned is already a registered name or prefix
  if (!registeredName) {
    registeredName = rawQuery.trim()
  }

  // 3. Shard lookup via first character
  const firstChar = registeredName[0]
  const shard = await getCompanyShard(firstChar, index)
  if (!shard) return null

  // Try exact registered name match
  let rawRecord: RawCompanyRecord | null = shard[registeredName] || null

  // If not found and input wasn't full company name, try prefix/fuzzy search in shard
  if (!rawRecord) {
    const qLower = cleaned.toLowerCase()
    const candidates = Object.keys(shard)

    // A. Starts with query (e.g. "聯發科技" -> "聯發科技股份有限公司")
    const prefixMatch = candidates.find(k => k.startsWith(cleaned) || k.startsWith(rawQuery.trim()))
    if (prefixMatch) {
      rawRecord = shard[prefixMatch]
      registeredName = prefixMatch
    } else {
      // B. Substring match
      const subMatch = candidates.find(k => k.includes(cleaned) && (k.endsWith('股份有限公司') || k.endsWith('有限公司')))
      if (subMatch) {
        rawRecord = shard[subMatch]
        registeredName = subMatch
      }
    }
  }

  if (!rawRecord) return null

  // Extract stock code and market if not resolved yet
  if (!matchedStockCode) {
    const rev = nameToStock.get(rawRecord.name)
    if (rev) {
      matchedStockCode = rev.code
      matchedMarket = rev.market
    } else if (rawRecord.aliases && rawRecord.aliases.length > 0) {
      matchedStockCode = rawRecord.aliases[0].code
      matchedMarket = rawRecord.aliases[0].market
    }
  }

  // Build enriched affiliates with stock tickers
  const upstreamAffiliates: TaiwanCompanyAffiliate[] = (rawRecord.relationships?.upstream || []).map(name => {
    const stockInfo = nameToStock.get(name)
    return {
      name,
      stockCode: stockInfo?.code,
      market: stockInfo?.market
    }
  })

  const downstreamAffiliates: TaiwanCompanyAffiliate[] = (rawRecord.relationships?.downstream || []).map(name => {
    const stockInfo = nameToStock.get(name)
    return {
      name,
      stockCode: stockInfo?.code,
      market: stockInfo?.market
    }
  })

  const webUrl =
    rawRecord.webUrl ||
    `https://taiwan-company-network.david888.com/graph?company=${encodeURIComponent(rawRecord.name)}`

  const result: TaiwanCompanyRecord = {
    name: rawRecord.name,
    id: rawRecord.id || '—',
    capital: rawRecord.capital || 0,
    capitalFormatted: formatTaiwanCapital(rawRecord.capital || 0),
    representative: rawRecord.representative || '—',
    address: rawRecord.address || '—',
    aliases: rawRecord.aliases || (matchedStockCode ? [{ code: matchedStockCode, market: matchedMarket || 'TWSE' }] : []),
    stockCode: matchedStockCode,
    market: matchedMarket,
    relationships: {
      upstream: upstreamAffiliates,
      downstream: downstreamAffiliates
    },
    webUrl
  }

  // Save to cache
  companyCache.set(cleaned, { data: result, expiresAt: now + CACHE_TTL_MS })
  if (matchedStockCode && matchedStockCode !== cleaned) {
    companyCache.set(matchedStockCode, { data: result, expiresAt: now + CACHE_TTL_MS })
  }
  companyCache.set(result.name, { data: result, expiresAt: now + CACHE_TTL_MS })

  return result
}
