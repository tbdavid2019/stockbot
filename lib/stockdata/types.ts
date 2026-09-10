import { z } from 'zod'

export const STOCKDATA_PROVIDER = 'stockdata.david888.com' as const

export const StockdataStatusSchema = z.enum([
  'live',
  'cached',
  'stale',
  'partial',
  'unavailable'
])

export const StockdataSourceSchema = z.object({
  provider: z.literal(STOCKDATA_PROVIDER),
  url: z.string().url(),
  fetchedAt: z.string(),
  asOf: z.string().optional(),
  endpoint: z.string().optional()
})

export const StockdataResultSchema = z.object({
  data: z.unknown().optional(),
  source: StockdataSourceSchema,
  status: StockdataStatusSchema,
  warnings: z.array(z.string())
})

export type StockdataStatus = z.infer<typeof StockdataStatusSchema>
export type StockdataSource = z.infer<typeof StockdataSourceSchema>
export type StockdataResult<T> = {
  data?: T
  source: StockdataSource
  status: StockdataStatus
  warnings: string[]
}

export type StockdataRecord = Record<string, unknown>

export function isRecord(value: unknown): value is StockdataRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function asRecords(value: unknown): StockdataRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    if (Array.isArray(value.data)) return value.data.filter(isRecord)
    if (Array.isArray(value.items)) return value.items.filter(isRecord)
    if (Array.isArray(value.results)) return value.results.filter(isRecord)
  }
  return []
}

export function jsonSafe<T>(value: T): T {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) => {
        if (typeof item === 'bigint') return Number(item)
        if (item instanceof Date) return item.toISOString()
        if (typeof item === 'number' && !Number.isFinite(item)) return null
        return item
      })
    ) as T
  } catch {
    return {} as T
  }
}

export function recordString(
  record: StockdataRecord | undefined,
  ...keys: string[]
): string | undefined {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

export function recordNumber(
  record: StockdataRecord | undefined,
  ...keys: string[]
): number | undefined {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/[%$,]/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}
