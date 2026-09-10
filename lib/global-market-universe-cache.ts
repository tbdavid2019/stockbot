import 'server-only'

import { unstable_cache } from 'next/cache'
import * as XLSX from 'xlsx'
import {
  normalizeHkexRows,
  normalizeJpxRows,
  normalizeNasdaqOtherText,
  normalizeNasdaqText,
  normalizeEuronextCsv,
  extractLseWorkbookLinks,
  normalizeLseCsv,
  normalizeLseWorkbookRows,
  normalizeSseSuggestionText,
  normalizeSzseRows,
  type LseWorkbookLink,
  type GlobalSecurity
} from './global-market-universe'
import { normalizeTpExRows, normalizeTwseRows } from './market-universe'

const SOURCES = {
  twse: 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L',
  tpex: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O',
  nasdaq: 'https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt',
  usOther: 'https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt',
  hkex: 'https://www.hkex.com.hk/-/media/HKEX-Market/Services/Trading/Securities/Securities-Lists/Securities-Using-Standard-Transfer-Form-(including-GEM)-By-Stock-Code-Order/secstkorder.xls',
  jpx: 'https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xlsx',
  sse: 'https://www.sse.com.cn/js/common/ssesuggestdataAll.js',
  szse: 'https://www.szse.cn/api/report/ShowReport?SHOWTYPE=xlsx&CATALOGID=1110&TABKEY=tab1',
  euronext:
    'https://live.euronext.com/product_directory/data/stocks-all-places/download?mics=ALXB%2CALXL%2CALXP%2CBGEM%2CENXB%2CENXL%2CETLX%2CEXGM%2CMERK%2CMIVX%2CMLXB%2CMTAH%2CTNLA%2CTNLB%2CXAMC%2CXAMS%2CXATL%2CXBRU%2CXESM%2CXLDN%2CXLIS%2CXMLI%2CXMSM%2CXOAS%2CXOSL%2CXPAR%2CXPMC',
  lsePage:
    'https://www.londonstockexchange.com/equities-trading/asset-classes/shares-trading/uk-and-european-securities',
  lsePageApi:
    'https://api.londonstockexchange.com/api/v1/pages?path=equities-trading%2Fasset-classes%2Fshares-trading%2Fuk-and-european-securities'
} as const

export const GLOBAL_MARKET_SOURCE_CATALOG = [
  {
    id: 'TWSE',
    market: 'Taiwan',
    url: SOURCES.twse,
    format: 'JSON',
    refresh: 'daily'
  },
  {
    id: 'TPEX',
    market: 'Taiwan',
    url: SOURCES.tpex,
    format: 'JSON',
    refresh: 'daily'
  },
  {
    id: 'NASDAQ',
    market: 'United States',
    url: SOURCES.nasdaq,
    format: 'pipe-delimited text',
    refresh: 'intraday'
  },
  {
    id: 'US_OTHER',
    market: 'United States',
    url: SOURCES.usOther,
    format: 'pipe-delimited text',
    refresh: 'intraday'
  },
  {
    id: 'HKEX',
    market: 'Hong Kong',
    url: SOURCES.hkex,
    format: 'XLSX',
    refresh: 'daily'
  },
  {
    id: 'JPX',
    market: 'Japan',
    url: SOURCES.jpx,
    format: 'XLSX',
    refresh: 'monthly'
  },
  {
    id: 'SSE',
    market: 'China',
    url: SOURCES.sse,
    format: 'official JavaScript directory',
    refresh: 'daily'
  },
  {
    id: 'SZSE',
    market: 'China',
    url: SOURCES.szse,
    format: 'XLSX',
    refresh: 'daily'
  },
  {
    id: 'EURONEXT',
    market: 'Europe',
    url: SOURCES.euronext,
    format: 'official CSV directory',
    refresh: 'daily'
  },
  {
    id: 'LSE',
    market: 'United Kingdom',
    url: SOURCES.lsePage,
    format: 'public page API → four official weekly XLSX files',
    refresh: 'weekly'
  }
] as const

const CACHE_REVALIDATE_SECONDS = 24 * 60 * 60

export type GlobalMarketUniverseSnapshot = {
  asOfDate: string
  fetchedAt: string
  securities: GlobalSecurity[]
  sourceUrls: string[]
  warnings: string[]
  stale?: boolean
}

let lastGoodSnapshot: GlobalMarketUniverseSnapshot | undefined
let inFlight:
  | { date: string; promise: Promise<GlobalMarketUniverseSnapshot> }
  | undefined

function taipeiDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: 'text/plain, application/javascript, */*' },
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

async function fetchJsonRows(url: string): Promise<unknown[]> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (!Array.isArray(payload)) throw new Error('Expected an array payload')
  return payload
}

async function fetchWorkbookRows(url: string): Promise<string[][]> {
  const response = await fetch(url, {
    headers: {
      Accept:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, */*'
    },
    next: { revalidate: CACHE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(20000)
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), {
    type: 'buffer',
    cellDates: false
  })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!firstSheet) throw new Error('Workbook has no sheets')
  return XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    raw: false,
    defval: null
  }) as string[][]
}

async function fetchLseWeeklySecurities(): Promise<GlobalSecurity[]> {
  const payload = JSON.parse(await fetchText(SOURCES.lsePageApi)) as unknown
  const links = extractLseWorkbookLinks(payload)
  if (links.length !== 4)
    throw new Error(`Expected 4 LSE weekly XLSX links, found ${links.length}`)

  const batches = await Promise.all(
    links.map(async (link: LseWorkbookLink) =>
      normalizeLseWorkbookRows(await fetchWorkbookRows(link.url), link.category)
    )
  )
  return batches.flat()
}

async function fetchOfficialSnapshot(
  asOfDate: string
): Promise<GlobalMarketUniverseSnapshot> {
  const jobs: Array<Promise<GlobalSecurity[]>> = [
    Promise.all([
      fetchJsonRows(SOURCES.twse),
      fetchJsonRows(SOURCES.tpex)
    ]).then(([twse, tpex]) => [
      ...normalizeTwseRows(twse),
      ...normalizeTpExRows(tpex)
    ]),
    fetchText(SOURCES.nasdaq).then(normalizeNasdaqText),
    fetchText(SOURCES.usOther).then(normalizeNasdaqOtherText),
    fetchWorkbookRows(SOURCES.hkex).then(normalizeHkexRows),
    fetchWorkbookRows(SOURCES.jpx).then(normalizeJpxRows),
    fetchText(SOURCES.sse).then(normalizeSseSuggestionText),
    fetchWorkbookRows(SOURCES.szse).then(normalizeSzseRows),
    fetch(SOURCES.euronext, {
      headers: { Accept: 'text/csv' },
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(15000)
    }).then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return normalizeEuronextCsv(await response.text())
    }),
    fetchLseWeeklySecurities()
  ]
  const labels = [
    'TWSE/TPEx',
    'NASDAQ',
    'US other exchanges',
    'HKEX',
    'JPX',
    'SSE',
    'SZSE',
    'Euronext',
    'LSE weekly XLSX'
  ]
  const lseUrl = process.env.GLOBAL_LSE_SOURCE_URL?.trim()
  if (lseUrl) {
    jobs.push(fetchText(lseUrl).then(normalizeLseCsv))
    labels.push('LSE authorized CSV')
  }
  const settled = await Promise.allSettled(jobs)
  const securities = settled.flatMap(item =>
    item.status === 'fulfilled' ? item.value : []
  )
  const warnings = settled.flatMap((item, index) =>
    item.status === 'rejected'
      ? [
          `${labels[index]} 清冊取得失敗：${item.reason instanceof Error ? item.reason.message : String(item.reason)}`
        ]
      : []
  )
  if (securities.length === 0)
    throw new Error('All official market-universe sources failed')

  const deduped = Array.from(
    new Map(securities.map(item => [item.canonicalTicker, item])).values()
  )
  return {
    asOfDate,
    fetchedAt: new Date().toISOString(),
    securities: deduped,
    sourceUrls: [
      SOURCES.twse,
      SOURCES.tpex,
      SOURCES.nasdaq,
      SOURCES.usOther,
      SOURCES.hkex,
      SOURCES.jpx,
      SOURCES.sse,
      SOURCES.szse,
      SOURCES.euronext,
      SOURCES.lsePage,
      SOURCES.lsePageApi,
      ...(lseUrl ? [lseUrl] : [])
    ],
    warnings
  }
}

export async function getGlobalMarketUniverse(): Promise<GlobalMarketUniverseSnapshot> {
  const asOfDate = taipeiDate()
  if (inFlight?.date === asOfDate) return inFlight.promise

  const loadForDate = unstable_cache(
    () => fetchOfficialSnapshot(asOfDate),
    ['global-market-universe', asOfDate],
    { revalidate: CACHE_REVALIDATE_SECONDS, tags: ['global-market-universe'] }
  )
  const promise = loadForDate()
    .then(snapshot => {
      lastGoodSnapshot = snapshot
      return snapshot
    })
    .catch(error => {
      if (lastGoodSnapshot) return { ...lastGoodSnapshot, stale: true }
      throw error
    })
    .finally(() => {
      if (inFlight?.date === asOfDate) inFlight = undefined
    })

  inFlight = { date: asOfDate, promise }
  return promise
}
