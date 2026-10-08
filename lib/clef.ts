/**
 * Clef-Flash System One Decision API Client
 *
 * Implements high-speed System 1 classification, scoring, and binary evaluation
 * with multi-tier failover (Primary -> Fallback 2 -> Fallback 3 / Jev),
 * circuit breaking, singleflight deduplication, and zero-downtime safe fallbacks.
 */

export interface ChoiceQuestion {
  type: 'choice'
  instructions?: string
  criteria: Record<string, string | null>
}

export interface NoulQuestion {
  type: 'noul'
  instructions?: string
  criteria?: Record<string, string | null> | null
}

export interface ScoreQuestion {
  type: 'score'
  instructions?: string
  criteria: string[]
}

export type ClefQuestion = ChoiceQuestion | NoulQuestion | ScoreQuestion

export interface ChoiceAnswer {
  type: 'choice'
  choice: string
  probabilities: Record<string, number>
  confidence: number
}

export interface NoulAnswer {
  type: 'noul'
  noul: number // probability that answer is true (0.0 to 1.0)
}

export interface ScoreAnswer {
  type: 'score'
  score: number
  legend?: Record<string, string>
  probabilities: Record<string, number>
  confidence: number
}

export type ClefAnswer = ChoiceAnswer | NoulAnswer | ScoreAnswer

export interface SystemOneRequest {
  model?: string
  state: any
  questions: Record<string, ClefQuestion>
  images?: string[] | null
}

export interface SystemOneResponse {
  model: string
  answers: Record<string, ClefAnswer>
  usage?: {
    input_tokens: number
    output_tokens: number
  }
  latency_seconds?: number
}

interface ClefEndpointConfig {
  name: string
  url: string
  timeoutMs: number
}

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<SystemOneResponse | null>>()

// Short-lived memory cache (60s TTL)
interface CacheEntry {
  expiresAt: number
  data: SystemOneResponse
}
const memoryCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60 * 1000
const MAX_CACHE_ENTRIES = 500

function setCacheEntry(key: string, data: SystemOneResponse) {
  const now = Date.now()
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    // Purge expired entries
    memoryCache.forEach((entry, k) => {
      if (now >= entry.expiresAt) {
        memoryCache.delete(k)
      }
    })
    // Evict oldest entries if still at capacity
    while (memoryCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = memoryCache.keys().next().value
      if (oldestKey) memoryCache.delete(oldestKey)
      else break
    }
  }

  memoryCache.set(key, {
    expiresAt: now + CACHE_TTL_MS,
    data
  })
}

// Endpoint Circuit Breakers
interface CircuitBreakerState {
  failures: number
  cooldownUntil: number
}
const circuitBreakers = new Map<string, CircuitBreakerState>()
const CIRCUIT_THRESHOLD = 2
const CIRCUIT_COOLDOWN_MS = 30 * 1000

function isCircuitOpen(endpointUrl: string): boolean {
  const cb = circuitBreakers.get(endpointUrl)
  if (!cb) return false
  if (cb.cooldownUntil > 0) {
    if (Date.now() < cb.cooldownUntil) {
      return true
    }
    // Cooldown passed, reset circuit
    circuitBreakers.delete(endpointUrl)
    return false
  }
  return false
}

function recordCircuitFailure(endpointUrl: string) {
  const cb = circuitBreakers.get(endpointUrl) || { failures: 0, cooldownUntil: 0 }
  cb.failures += 1
  if (cb.failures >= CIRCUIT_THRESHOLD) {
    cb.cooldownUntil = Date.now() + CIRCUIT_COOLDOWN_MS
  }
  circuitBreakers.set(endpointUrl, cb)
}

function recordCircuitSuccess(endpointUrl: string) {
  circuitBreakers.delete(endpointUrl)
}

export function _resetClefStateForTests() {
  memoryCache.clear()
  circuitBreakers.clear()
  inFlightRequests.clear()
}

function getEndpoints(): ClefEndpointConfig[] {
  const primaryUrl =
    process.env.CLEF_PRIMARY_URL || 'https://clef.create360.ai/v1/systemone'
  const fallback2Url =
    process.env.CLEF_FALLBACK_2_URL || 'https://clef.aiurl.tw/v1/systemone'
  const fallback3Url =
    process.env.CLEF_FALLBACK_3_URL ||
    process.env.JEV_SYSTEMONE_URL ||
    process.env.JEV_URL ||
    'https://jev.create360.ai/v1/systemone'

  return [
    {
      name: 'Primary (create360)',
      url: primaryUrl,
      timeoutMs: Number(process.env.CLEF_PRIMARY_TIMEOUT_MS) || 1200
    },
    {
      name: 'Fallback 2 (aiurl)',
      url: fallback2Url,
      timeoutMs: Number(process.env.CLEF_FALLBACK_TIMEOUT_MS) || 2500
    },
    {
      name: 'Fallback 3 (jev)',
      url: fallback3Url,
      timeoutMs: Number(process.env.CLEF_FALLBACK_TIMEOUT_MS) || 2500
    }
  ]
}

export interface SystemOneOptions {
  timeoutMs?: number
  totalTimeoutMs?: number
  skipCache?: boolean
}

/**
 * Execute a typed System One decision request with multi-tier failover
 */
export async function evaluateSystemOne(
  request: SystemOneRequest,
  options?: SystemOneOptions
): Promise<SystemOneResponse | null> {
  const cacheKey = JSON.stringify({
    model: request.model || 'clef-flash',
    state: request.state,
    questions: request.questions,
    images: request.images || null
  })

  // 1. Check cache
  if (!options?.skipCache) {
    const cached = memoryCache.get(cacheKey)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data
    }
  }

  // 2. Singleflight deduplication
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!
  }

  const executionPromise = (async (): Promise<SystemOneResponse | null> => {
    const endpoints = getEndpoints()
    const perEndpointTimeout = options?.timeoutMs
    const totalBudgetMs =
      options?.totalTimeoutMs ||
      (perEndpointTimeout ? Math.min(2200, Math.round(perEndpointTimeout * 1.8)) : 2200)
    const deadline = Date.now() + totalBudgetMs

    for (const ep of endpoints) {
      if (isCircuitOpen(ep.url)) {
        continue
      }

      const remainingMs = deadline - Date.now()
      if (remainingMs <= 50) {
        break // Total deadline reached, avoid compounding timeouts
      }

      const timeout = Math.min(perEndpointTimeout || ep.timeoutMs, remainingMs)
      try {
        const payload = {
          model: request.model || 'clef-flash',
          state: request.state,
          questions: request.questions,
          ...(request.images ? { images: request.images } : {})
        }

        const res = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'stockbot-clef-client/1.0'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeout)
        })

        if (!res.ok) {
          recordCircuitFailure(ep.url)
          continue
        }

        const data = (await res.json()) as SystemOneResponse
        if (data && data.answers && typeof data.answers === 'object' && !Array.isArray(data.answers)) {
          recordCircuitSuccess(ep.url)
          // Bounded cache with eviction
          setCacheEntry(cacheKey, data)
          return data
        }
      } catch (err) {
        recordCircuitFailure(ep.url)
        // Move silently to next fallback endpoint
      }
    }

    return null
  })()

  inFlightRequests.set(cacheKey, executionPromise)
  try {
    return await executionPromise
  } finally {
    inFlightRequests.delete(cacheKey)
  }
}
