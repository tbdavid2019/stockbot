/**
 * Lightweight in-memory rate limiter for Next.js API Routes and Server Actions
 * Protects public endpoints from automated scraping, credential stuffing, and DoS.
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

const memoryStore = new Map<string, RateLimitRecord>()

// Cleanup stale records every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    memoryStore.forEach((record, key) => {
      if (record.resetTime <= now) {
        memoryStore.delete(key)
      }
    })
  }, 5 * 60 * 1000).unref?.()
}

export interface RateLimitOptions {
  intervalMs?: number // Window duration in ms (default: 60,000ms = 1 minute)
  maxRequests?: number // Max allowed requests per window (default: 30)
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { intervalMs = 60 * 1000, maxRequests = 30 } = options
  const now = Date.now()
  const cleanId = identifier.trim() || 'unknown'

  let record = memoryStore.get(cleanId)

  if (!record || record.resetTime <= now) {
    record = {
      count: 1,
      resetTime: now + intervalMs
    }
    memoryStore.set(cleanId, record)
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: record.resetTime
    }
  }

  record.count++

  if (record.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: record.resetTime
    }
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    reset: record.resetTime
  }
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }
  return '127.0.0.1'
}
