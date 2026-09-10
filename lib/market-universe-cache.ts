import 'server-only'

import { unstable_cache } from 'next/cache'
import {
  normalizeTpExRows,
  normalizeTwseRows,
  type MarketSecurity
} from './market-universe'

const TWSE_SECURITIES_URL = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L'
const TPEX_SECURITIES_URL =
  'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O'
const CACHE_REVALIDATE_SECONDS = 24 * 60 * 60

export type TaiwanMarketUniverseSnapshot = {
  asOfDate: string
  fetchedAt: string
  securities: MarketSecurity[]
  sourceUrls: string[]
  stale?: boolean
}

let lastGoodSnapshot: TaiwanMarketUniverseSnapshot | undefined
let inFlight:
  | { date: string; promise: Promise<TaiwanMarketUniverseSnapshot> }
  | undefined

function taipeiDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

async function fetchRows(url: string): Promise<unknown[]> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: CACHE_REVALIDATE_SECONDS }
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`)
  const payload: unknown = await response.json()
  if (!Array.isArray(payload))
    throw new Error(`Invalid array payload from ${url}`)
  return payload
}

async function fetchOfficialSnapshot(
  asOfDate: string
): Promise<TaiwanMarketUniverseSnapshot> {
  const [twseRows, tpexRows] = await Promise.all([
    fetchRows(TWSE_SECURITIES_URL),
    fetchRows(TPEX_SECURITIES_URL)
  ])
  const securities = [
    ...normalizeTwseRows(twseRows),
    ...normalizeTpExRows(tpexRows)
  ]
  if (securities.length === 0)
    throw new Error('Official Taiwan market universe is empty')

  return {
    asOfDate,
    fetchedAt: new Date().toISOString(),
    securities,
    sourceUrls: [TWSE_SECURITIES_URL, TPEX_SECURITIES_URL]
  }
}

export async function getTaiwanMarketUniverse(): Promise<TaiwanMarketUniverseSnapshot> {
  const asOfDate = taipeiDate()
  if (inFlight?.date === asOfDate) return inFlight.promise

  const loadForDate = unstable_cache(
    () => fetchOfficialSnapshot(asOfDate),
    ['taiwan-market-universe', asOfDate],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ['taiwan-market-universe'] }
  )

  const promise = loadForDate()
    .then(snapshot => {
      lastGoodSnapshot = snapshot
      return snapshot
    })
    .catch(error => {
      if (lastGoodSnapshot) {
        return { ...lastGoodSnapshot, stale: true }
      }
      throw error
    })
    .finally(() => {
      if (inFlight?.date === asOfDate) inFlight = undefined
    })

  inFlight = { date: asOfDate, promise }
  return promise
}
