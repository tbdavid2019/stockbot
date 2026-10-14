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
  type: 'systemone' | 'openai-decisions'
  authHeader?: string
  model?: string
  skipIfNoAuth?: boolean
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

export interface SystemOneOptions {
  timeoutMs?: number
  totalTimeoutMs?: number
  skipCache?: boolean
  openAiApiKey?: string
  typesafeApiKey?: string
}

function getEndpoints(options?: SystemOneOptions): ClefEndpointConfig[] {
  const primaryUrl =
    process.env.CLEF_PRIMARY_URL || 'https://clef.create360.ai/v1/systemone'
  const fallback2Url =
    process.env.CLEF_FALLBACK_2_URL || 'https://clef.aiurl.tw/v1/systemone'

  // Fallback 3 (Jev / TypeSafe)
  const typesafeApiKey =
    options?.typesafeApiKey ||
    process.env.TYPESAFE_API_KEY ||
    process.env.JEV_API_KEY
  const fallback3Url =
    process.env.CLEF_FALLBACK_3_URL ||
    process.env.JEV_SYSTEMONE_URL ||
    process.env.TYPESAFE_API_URL ||
    process.env.JEV_URL ||
    'https://api.typesafe.ai/v1/systemone'
  const isTypeSafeOfficial = fallback3Url.includes('api.typesafe.ai')

  // Fallback 4 (OpenAI Decisions API)
  const openAiApiKey =
    options?.openAiApiKey ||
    process.env.OPENAI_DECISIONS_API_KEY ||
    process.env.OPENAI_API_KEY
  const fallback4Url =
    process.env.OPENAI_DECISIONS_URL ||
    'https://api.openai.com/v1/decisions'
  const fallback4Model =
    process.env.OPENAI_DECISIONS_MODEL ||
    'gpt-6-luna'

  return [
    {
      name: 'Primary (create360)',
      url: primaryUrl,
      timeoutMs: Number(process.env.CLEF_PRIMARY_TIMEOUT_MS) || 1200,
      type: 'systemone'
    },
    {
      name: 'Fallback 2 (aiurl)',
      url: fallback2Url,
      timeoutMs: Number(process.env.CLEF_FALLBACK_TIMEOUT_MS) || 2500,
      type: 'systemone'
    },
    {
      name: 'Fallback 3 (jev/typesafe)',
      url: fallback3Url,
      timeoutMs: Number(process.env.CLEF_FALLBACK_TIMEOUT_MS) || 2500,
      type: 'systemone',
      model: isTypeSafeOfficial ? 'jev-latest' : undefined,
      authHeader: typesafeApiKey ? `Bearer ${typesafeApiKey}` : undefined,
      skipIfNoAuth: isTypeSafeOfficial && !typesafeApiKey
    },
    {
      name: 'Fallback 4 (openai-decisions)',
      url: fallback4Url,
      timeoutMs: Number(process.env.CLEF_FALLBACK_TIMEOUT_MS) || 2500,
      type: 'openai-decisions',
      model: fallback4Model,
      authHeader: openAiApiKey ? `Bearer ${openAiApiKey}` : undefined,
      skipIfNoAuth: !openAiApiKey
    }
  ]
}

export function formatOpenAiInput(state: any): string {
  if (typeof state === 'string') return state
  if (state === null || state === undefined) return ''
  try {
    return JSON.stringify(state)
  } catch {
    return String(state)
  }
}

export function mapSystemOneQuestionsToOpenAi(
  questions: Record<string, ClefQuestion>
): any[] {
  return Object.entries(questions).map(([key, q]) => {
    if (q.type === 'choice') {
      const choices = Object.entries(q.criteria || {}).map(([val, desc]) => ({
        value: val,
        description: desc || undefined
      }))
      return {
        name: key,
        type: 'choice',
        instructions: q.instructions || undefined,
        choices
      }
    }
    if (q.type === 'noul') {
      return {
        name: key,
        type: 'predicate',
        instructions: q.instructions || undefined
      }
    }
    if (q.type === 'score') {
      return {
        name: key,
        type: 'score',
        instructions: q.instructions || undefined,
        levels: Array.isArray(q.criteria) ? q.criteria : []
      }
    }
    return {
      name: key,
      type: (q as any).type,
      instructions: (q as any).instructions
    }
  })
}

export function parseOpenAiDecisionsResponse(
  data: any,
  originalQuestions: Record<string, ClefQuestion>
): SystemOneResponse | null {
  if (!data) return null
  const answersArray = Array.isArray(data.answers)
    ? data.answers
    : Array.isArray(data.decisions)
      ? data.decisions
      : null
  if (!answersArray) return null

  const answers: Record<string, ClefAnswer> = {}
  for (const item of answersArray) {
    if (!item || !item.name) continue
    const name = String(item.name)
    const originalQ = originalQuestions[name]

    if (item.type === 'choice') {
      const choiceVal = String(item.choice || '')
      const confidence =
        typeof item.confidence === 'number' && Number.isFinite(item.confidence)
          ? item.confidence
          : 0.85
      const probs =
        item.probabilities && typeof item.probabilities === 'object'
          ? item.probabilities
          : { [choiceVal]: confidence }

      answers[name] = {
        type: 'choice',
        choice: choiceVal,
        confidence,
        probabilities: probs
      }
    } else if (item.type === 'predicate') {
      const prob =
        typeof item.probability === 'number' && Number.isFinite(item.probability)
          ? item.probability
          : 0.5
      answers[name] = {
        type: 'noul',
        noul: prob
      }
    } else if (item.type === 'score') {
      let legend: Record<string, string> | undefined
      if (originalQ && originalQ.type === 'score' && Array.isArray(originalQ.criteria)) {
        legend = {}
        originalQ.criteria.forEach((crit, idx) => {
          legend![String(idx)] = typeof crit === 'string' ? crit : JSON.stringify(crit)
        })
      }
      answers[name] = {
        type: 'score',
        score: typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : 0,
        legend,
        probabilities:
          item.probabilities && typeof item.probabilities === 'object'
            ? item.probabilities
            : {},
        confidence:
          typeof item.confidence === 'number' && Number.isFinite(item.confidence)
            ? item.confidence
            : 0.85
      }
    }
  }

  return {
    model: data.model || 'gpt-6-luna',
    answers,
    usage: data.usage
      ? {
          input_tokens: Number(data.usage.input_tokens) || 0,
          output_tokens: Number(data.usage.output_tokens) || 0
        }
      : undefined
  }
}

/**
 * Execute a typed System One decision request with multi-tier failover
 * (Primary -> Fallback 2 -> Jev -> OpenAI Decisions -> Safe Null)
 */
export async function evaluateSystemOne(
  request: SystemOneRequest,
  options?: SystemOneOptions
): Promise<SystemOneResponse | null> {
  const authFingerprint = options?.openAiApiKey
    ? options.openAiApiKey.slice(-6)
    : options?.typesafeApiKey
      ? options.typesafeApiKey.slice(-6)
      : 'shared'

  const cacheKey = JSON.stringify({
    model: request.model || 'clef-flash',
    state: request.state,
    questions: request.questions,
    images: request.images || null,
    authFingerprint
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
    const endpoints = getEndpoints(options)
    const perEndpointTimeout = options?.timeoutMs
    const totalBudgetMs =
      options?.totalTimeoutMs ||
      (perEndpointTimeout ? Math.min(2500, Math.round(perEndpointTimeout * 2.0)) : 2500)
    const deadline = Date.now() + totalBudgetMs

    for (const ep of endpoints) {
      if (ep.skipIfNoAuth) {
        // Clear any stale failure circuit for an unauthenticated endpoint
        circuitBreakers.delete(ep.url)
        continue
      }
      if (isCircuitOpen(ep.url)) {
        continue
      }

      const remainingMs = deadline - Date.now()
      if (remainingMs <= 50) {
        break // Total deadline reached, avoid compounding timeouts
      }

      const timeout = Math.min(perEndpointTimeout || ep.timeoutMs, remainingMs)
      try {
        if (ep.type === 'openai-decisions') {
          const payload = {
            model: ep.model || 'gpt-6-luna',
            input: formatOpenAiInput(request.state),
            questions: mapSystemOneQuestionsToOpenAi(request.questions)
          }

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'stockbot-clef-client/1.0'
          }
          if (ep.authHeader) {
            headers['Authorization'] = ep.authHeader
          }

          const res = await fetch(ep.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(timeout)
          })

          if (!res.ok) {
            recordCircuitFailure(ep.url)
            continue
          }

          const data = await res.json()
          const parsed = parseOpenAiDecisionsResponse(data, request.questions)
          if (parsed && parsed.answers && Object.keys(parsed.answers).length > 0) {
            recordCircuitSuccess(ep.url)
            setCacheEntry(cacheKey, parsed)
            return parsed
          } else {
            recordCircuitFailure(ep.url)
            continue
          }
        }

        // Standard System One (Clef / Jev)
        const payload = {
          model: ep.model || request.model || 'clef-flash',
          state: request.state,
          questions: request.questions,
          ...(request.images ? { images: request.images } : {})
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'stockbot-clef-client/1.0'
        }
        if (ep.authHeader) {
          headers['Authorization'] = ep.authHeader
        }

        const res = await fetch(ep.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeout)
        })

        if (!res.ok) {
          recordCircuitFailure(ep.url)
          continue
        }

        const data = (await res.json()) as SystemOneResponse
        if (
          data &&
          data.answers &&
          typeof data.answers === 'object' &&
          !Array.isArray(data.answers)
        ) {
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
