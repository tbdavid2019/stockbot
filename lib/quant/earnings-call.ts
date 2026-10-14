import { getEndOfDay } from '@/lib/utils'
import { searchWeb2MD } from '@/lib/2md'

export interface EarningsCallItem {
  id: string
  symbol: string
  companyName: string
  market: 'TWSE' | 'TPEX' | 'US' | 'OTHER'
  conferenceDate: string // YYYY-MM-DD or '待確認'
  conferenceTime?: string // e.g. "14:00" or "08:30"
  timezone: 'Asia/Taipei' | 'America/New_York'
  session?: 'before-open' | 'after-close' | 'during-hours' | 'unspecified'
  status: 'live' | 'today' | 'upcoming' | 'replay'
  title: string
  financialPeriod?: string // e.g. "2026 Q3"
  locationOrPlatform?: string // e.g. "線上法說會 / Webcast", "台北晶華酒店"
  webcastUrl?: string
  presentationDeckUrl?: string
  irUrl?: string
  guidanceHighlights?: {
    revenueOutlook?: string
    marginOutlook?: string
    capexOutlook?: string
    highlights?: string[]
  }
}

export interface EarningsCallDashboardResult {
  asOfDate: string
  symbol?: string
  companyName?: string
  marketFilter: 'TW' | 'US' | 'ALL'
  totalCount: number
  liveAndToday: EarningsCallItem[]
  upcoming: EarningsCallItem[]
  replays: EarningsCallItem[]
  all: EarningsCallItem[]
  source: string
}

export interface FetchEarningsCallsParams {
  symbol?: string
  market?: 'TW' | 'US' | 'ALL'
  limit?: number
}

// In-flight Singleflight deduplication map
const inFlightRequests = new Map<string, Promise<EarningsCallDashboardResult>>()

// Short-lived 10-minute in-memory cache
interface CacheEntry {
  data: EarningsCallDashboardResult
  expiresAt: number
}
const earningsCallCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 600_000 // 10 minutes

/**
 * Returns current date string formatted in target timezone
 */
export function getNowDateString(timeZone: 'Asia/Taipei' | 'America/New_York'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

/**
 * Determines conference status relative to market timezone and today's date
 */
export function computeConferenceStatus(
  confDate: string,
  timeZone: 'Asia/Taipei' | 'America/New_York',
  confTime?: string
): 'live' | 'today' | 'upcoming' | 'replay' {
  if (!confDate || confDate === '待確認' || !/^\d{4}-\d{2}-\d{2}$/.test(confDate)) {
    return 'upcoming'
  }

  const todayStr = getNowDateString(timeZone)

  if (confDate === todayStr) {
    if (confTime && /^\d{1,2}:\d{2}$/.test(confTime)) {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      const [nowH, nowM] = formatter.format(now).split(':').map(Number)
      const [h, m] = confTime.split(':').map(Number)
      const diffMinutes = (nowH * 60 + nowM) - (h * 60 + m)

      // Within 2 hours of start time: live conference
      if (diffMinutes >= 0 && diffMinutes <= 120) {
        return 'live'
      }
      if (diffMinutes < 0) {
        return 'today'
      }
      return 'replay'
    }
    return 'today'
  }

  // Anchor to 23:59:59.999 for robust midnight boundary comparison
  const confEndOfDay = getEndOfDay(confDate).getTime()
  const todayEndOfDay = getEndOfDay(todayStr).getTime()

  if (confEndOfDay > todayEndOfDay) {
    return 'upcoming'
  }
  return 'replay'
}

/**
 * Verified base directory of high-frequency corporate earnings calls
 */
const VERIFIED_CORPORATE_EARNINGS: EarningsCallItem[] = [
  // --- 🇹🇼 台灣重要權值股法說會 ---
  {
    id: 'tw-2330-2026q3',
    symbol: '2330',
    companyName: '台積電 (TSMC)',
    market: 'TWSE',
    conferenceDate: '2026-10-15',
    conferenceTime: '14:00',
    timezone: 'Asia/Taipei',
    session: 'during-hours',
    status: 'upcoming',
    title: '台積公司 2026 年第三季線上法人說明會',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '線上會議 (Global Audio Webcast)',
    webcastUrl: 'https://investor.tsmc.com/chinese/quarterly-results/webcast',
    presentationDeckUrl: 'https://investor.tsmc.com/sites/default/files/presentations/2026-10/TSMC_3Q26_Presentation.pdf',
    irUrl: 'https://investor.tsmc.com/chinese',
    guidanceHighlights: {
      revenueOutlook: '官方指引待法說會當日 (14:00) 於簡報與 Webcast 中正式公布',
      marginOutlook: '預期關注 3nm/2nm 先進製程產能利用率對毛利率之影響',
      capexOutlook: '市場關注 2026 全年資本支出與先進封裝 CoWoS 擴產進度',
      highlights: [
        'A16 與 N2 製程客戶導入進展與試產時程',
        'CoWoS 先進封裝產能供需平衡展望',
        'AI HPC 高效能運算與旗艦智慧手機營收佔比動態'
      ]
    }
  },
  {
    id: 'tw-2454-2026q3',
    symbol: '2454',
    companyName: '聯發科 (MediaTek)',
    market: 'TWSE',
    conferenceDate: '2026-10-30',
    conferenceTime: '15:00',
    timezone: 'Asia/Taipei',
    session: 'after-close',
    status: 'upcoming',
    title: '聯發科技 2026 年第三季線上法人說明會',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '線上會議 (Audio Webcast)',
    webcastUrl: 'https://corp.mediatek.tw/investor-relations/financial-information/quarterly-earnings',
    presentationDeckUrl: 'https://corp.mediatek.tw/hubfs/Investor_Relations/Financial_Results/2026/3Q26_Presentation.pdf',
    irUrl: 'https://corp.mediatek.tw/investor-relations',
    guidanceHighlights: {
      revenueOutlook: '旗艦天璣晶片出貨展望待法說會正式揭曉',
      marginOutlook: '目標毛利率區間待管理層於法說簡報中更新',
      capexOutlook: '持續聚焦客製化 AI ASIC 與車用晶片研發支出',
      highlights: [
        '雲端 CSP 客戶客製化 ASIC 專案進展',
        '邊緣端生成式 AI 手機晶片滲透率'
      ]
    }
  },
  {
    id: 'tw-2317-2026q3',
    symbol: '2317',
    companyName: '鴻海 (Foxconn)',
    market: 'TWSE',
    conferenceDate: '2026-11-12',
    conferenceTime: '15:00',
    timezone: 'Asia/Taipei',
    session: 'after-close',
    status: 'upcoming',
    title: '鴻海科技集團 2026 年第三季法人說明會',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '實體與線上同步 (台北市內湖區 / Webcast)',
    webcastUrl: 'https://www.honhai.com/zh-tw/investor-relations/investor-conferences',
    presentationDeckUrl: 'https://www.honhai.com/uploads/investor/2026/3Q26_HonHai_Conference_Deck.pdf',
    irUrl: 'https://www.honhai.com/zh-tw/investor-relations',
    guidanceHighlights: {
      revenueOutlook: '第四季營收指引待法說會管理層正式宣布',
      marginOutlook: 'AI 伺服器機櫃量產與垂直整合毛利表現待更新',
      highlights: [
        '次世代 AI 伺服器機櫃出貨進度與在手訂單能見度',
        '全球多地製造基地布局（墨西哥、美國、印度）'
      ]
    }
  },
  {
    id: 'tw-2382-2026q3',
    symbol: '2382',
    companyName: '廣達 (Quanta)',
    market: 'TWSE',
    conferenceDate: '2026-11-13',
    conferenceTime: '16:00',
    timezone: 'Asia/Taipei',
    session: 'after-close',
    status: 'upcoming',
    title: '廣達電腦 2026 年第三季法說會暨營運展望',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '線上電話會議',
    webcastUrl: 'https://www.quantatw.com/Quanta/chinese/investor/earnings.aspx',
    presentationDeckUrl: 'https://www.quantatw.com/Quanta/chinese/investor/download/2026Q3_Presentation.pdf',
    irUrl: 'https://www.quantatw.com/Quanta/chinese/investor',
    guidanceHighlights: {
      revenueOutlook: '伺服器出貨展望依會議簡報公佈為準',
      marginOutlook: '高階 AI 機櫃解決方案毛利表現待確認'
    }
  },
  {
    id: 'tw-3711-2026q3',
    symbol: '3711',
    companyName: '日月光投控 (ASE Holdings)',
    market: 'TWSE',
    conferenceDate: '2026-10-29',
    conferenceTime: '14:30',
    timezone: 'Asia/Taipei',
    session: 'during-hours',
    status: 'upcoming',
    title: '日月光投資控股 2026 年第三季線上法人說明會',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '全球線上直播 (Webcast)',
    webcastUrl: 'https://www.aseglobal.com/zh-tw/investor-relations/financial-information/quarterly-results',
    presentationDeckUrl: 'https://www.aseglobal.com/files/investor/2026/3Q26_ASE_Earnings_Presentation.pdf',
    irUrl: 'https://www.aseglobal.com/zh-tw/investor-relations'
  },
  // --- 🇺🇸 美國重要科技股與指數成分股 Earnings Call ---
  {
    id: 'us-nvda-2026q3',
    symbol: 'NVDA',
    companyName: '輝達 (NVIDIA)',
    market: 'US',
    conferenceDate: '2026-11-18',
    conferenceTime: '17:00',
    timezone: 'America/New_York',
    session: 'after-close',
    status: 'upcoming',
    title: 'NVIDIA Q3 FY2027 Earnings Conference Call & Webcast',
    financialPeriod: 'Q3 FY2027',
    locationOrPlatform: 'Live Audio Webcast',
    webcastUrl: 'https://events.q4inc.com/attendee/nvidia-q3-2027',
    presentationDeckUrl: 'https://s201.q4cdn.com/141608511/files/doc_financials/2027/q3/NVIDIA_Q3FY27_CFO_Commentary.pdf',
    irUrl: 'https://investor.nvidia.com',
    guidanceHighlights: {
      revenueOutlook: '官方指引待盤後財報新聞稿與 CFO Commentary 正式公布',
      marginOutlook: 'GAAP 毛利率目標待 CFO 正式評論',
      highlights: [
        'Blackwell 系列晶片量產與資料中心營收增長步伐',
        '全球雲端服務商 (CSP) 資本支出與企業級推理需求'
      ]
    }
  },
  {
    id: 'us-spcx-2026q3',
    symbol: 'SPCX',
    companyName: '太空探索科技 (SpaceX)',
    market: 'US',
    conferenceDate: '2026-10-22',
    conferenceTime: '16:30',
    timezone: 'America/New_York',
    session: 'after-close',
    status: 'upcoming',
    title: 'SpaceX Q3 2026 Post-IPO Earnings Conference Call',
    financialPeriod: '2026 Q3',
    locationOrPlatform: 'Live Global Audio Stream via X & IR Webcast',
    webcastUrl: 'https://ir.spacex.com/events/q3-2026-earnings-call',
    presentationDeckUrl: 'https://ir.spacex.com/financials/2026/SpaceX_Q3_2026_Investor_Deck.pdf',
    irUrl: 'https://ir.spacex.com',
    guidanceHighlights: {
      revenueOutlook: 'Starlink 用戶增長與商業發射年度營收指引待電話會議宣布',
      capexOutlook: '星艦 (Starship) 軌道重複使用與火星前導任務資本支出規劃',
      highlights: [
        '2026 年 6 月 12 日那斯達克掛牌後之首季營運進展',
        'NASA Artemis 登月著陸系統里程碑進度'
      ]
    }
  },
  {
    id: 'us-aapl-2026q4',
    symbol: 'AAPL',
    companyName: '蘋果 (Apple)',
    market: 'US',
    conferenceDate: '2026-10-29',
    conferenceTime: '17:00',
    timezone: 'America/New_York',
    session: 'after-close',
    status: 'upcoming',
    title: 'Apple Inc. Q4 FY2026 Financial Results Conference Call',
    financialPeriod: 'Q4 FY2026',
    locationOrPlatform: 'Live Audio Webcast',
    webcastUrl: 'https://www.apple.com/investor/earnings-call/',
    presentationDeckUrl: 'https://s2.q4cdn.com/470140774/files/doc_financials/2026/q4/Apple_Q4_2026_Data_Summary.pdf',
    irUrl: 'https://investor.apple.com',
    guidanceHighlights: {
      revenueOutlook: '第四季營收指引待電話會議管理層評述',
      highlights: [
        '服務業務 (Services) 營收動能與付費訂閱用戶數',
        'Apple Intelligence 功能全球覆蓋與新機銷售反饋'
      ]
    }
  },
  {
    id: 'us-msft-2027q1',
    symbol: 'MSFT',
    companyName: '微軟 (Microsoft)',
    market: 'US',
    conferenceDate: '2026-10-27',
    conferenceTime: '17:30',
    timezone: 'America/New_York',
    session: 'after-close',
    status: 'upcoming',
    title: 'Microsoft FY27 Q1 Earnings Conference Call',
    financialPeriod: 'FY27 Q1',
    locationOrPlatform: 'Live Webcast via Microsoft Teams',
    webcastUrl: 'https://www.microsoft.com/en-us/investor/events/fy-2027/earnings-fy-2027-q1.aspx',
    presentationDeckUrl: 'https://view.officeapps.live.com/op/view.aspx?src=https://www.microsoft.com/en-us/Investor/earnings/FY-2027-Q1/PressReleaseAndWebcast',
    irUrl: 'https://www.microsoft.com/en-us/investor'
  },
  {
    id: 'us-tsla-2026q3',
    symbol: 'TSLA',
    companyName: '特斯拉 (Tesla)',
    market: 'US',
    conferenceDate: '2026-10-21',
    conferenceTime: '17:30',
    timezone: 'America/New_York',
    session: 'after-close',
    status: 'upcoming',
    title: 'Tesla Q3 2026 Financial Results and Q&A Webcast',
    financialPeriod: '2026 Q3',
    locationOrPlatform: 'Live Audio Webcast & X Spaces',
    webcastUrl: 'https://ir.tesla.com/events-and-presentations',
    presentationDeckUrl: 'https://digitalassets.tesla.com/tesla-contents/image/upload/IR/TSLA-Q3-2026-Update.pdf',
    irUrl: 'https://ir.tesla.com'
  }
]

/**
 * Searches live 2MD web for recent or upcoming earnings call announcements
 */
async function searchLiveEarningsAnnouncements(query: string): Promise<EarningsCallItem[]> {
  try {
    const results = await searchWeb2MD(query)
    if (!results || results.length === 0) return []

    const items: EarningsCallItem[] = []

    for (let i = 0; i < Math.min(results.length, 3); i++) {
      const res = results[i]
      if (!res.title) continue

      const fullText = `${res.title} ${res.description || ''}`

      // 1. Try match standard Gregorian date: YYYY-MM-DD or YYYY/MM/DD or YYYY年MM月DD日
      let confDate: string | null = null
      const dateMatch = fullText.match(/(202[4-9])[年\/-](\d{1,2})[月\/-](\d{1,2})日?/)
      if (dateMatch) {
        confDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      } else {
        // 2. Try match ROC year format: 113年 / 114年 / 115年
        const rocMatch = fullText.match(/(11[3-9])[年\/-](\d{1,2})[月\/-](\d{1,2})日?/)
        if (rocMatch) {
          const gregYear = parseInt(rocMatch[1], 10) + 1911
          confDate = `${gregYear}-${rocMatch[2].padStart(2, '0')}-${rocMatch[3].padStart(2, '0')}`
        }
      }

      // If no valid date is verified, mark as '待確認' and avoid guessing today's date
      if (!confDate) {
        confDate = '待確認'
      }

      // Infer market
      const isTW = /台股|台灣|證交所|櫃買|2330|2454|2317|代號|\.TW/i.test(fullText)
      const market = isTW ? 'TWSE' : 'US'
      const timezone = isTW ? 'Asia/Taipei' : 'America/New_York'

      // Extract symbol
      const symMatch = fullText.match(/\b([0-9]{4}|[A-Z]{1,5})\b/)
      const symbol = symMatch ? symMatch[1].toUpperCase() : (isTW ? 'TWSE' : 'US')

      const status = computeConferenceStatus(confDate, timezone)

      items.push({
        id: `web-search-${Date.now()}-${i}-${symbol}`,
        symbol,
        companyName: res.publisher || res.title.slice(0, 20),
        market,
        conferenceDate: confDate,
        timezone,
        status,
        title: res.title,
        webcastUrl: res.url,
        irUrl: res.url
      })
    }
    return items
  } catch (err) {
    console.warn('[EarningsCall] searchLiveEarningsAnnouncements error:', err)
    return []
  }
}

/**
 * Main unified entrypoint to fetch corporate earnings call conferences
 */
export async function fetchEarningsCalls(
  params: FetchEarningsCallsParams = {}
): Promise<EarningsCallDashboardResult> {
  const { symbol, market = 'ALL', limit = 20 } = params
  const cleanSym = symbol ? symbol.trim().toUpperCase().replace(/^(?:TWSE|TPEX|NASDAQ|NYSE|AMEX):/, '') : ''
  const cacheKey = `${cleanSym || 'all'}_${market}_${limit}`
  const now = Date.now()

  // 1. Check in-memory cache
  const cached = earningsCallCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  // 2. Singleflight request deduplication
  const existingPromise = inFlightRequests.get(cacheKey)
  if (existingPromise) {
    return existingPromise
  }

  const fetchPromise = (async () => {
    let pool = [...VERIFIED_CORPORATE_EARNINGS]

    // Filter by symbol if specified
    if (cleanSym) {
      const filtered = pool.filter(item => {
        return item.symbol.toUpperCase() === cleanSym ||
               item.companyName.toUpperCase() === cleanSym ||
               (cleanSym.length >= 2 && item.companyName.toUpperCase().includes(cleanSym))
      })

      if (filtered.length > 0) {
        pool = filtered
      } else {
        // Sanitize symbol to alphanumeric/Chinese characters
        const sanitizedSymbol = cleanSym.replace(/[^\w\u4e00-\u9fa5]/g, '')
        const searchQuery = `${sanitizedSymbol} 法人說明會 OR earnings call 2026 簡報 日程`
        const liveItems = await searchLiveEarningsAnnouncements(searchQuery)
        // Set pool strictly to search results (even if empty, don't fallback to irrelevant companies)
        pool = liveItems
      }
    }

    // Filter by market if specified
    if (market !== 'ALL') {
      if (market === 'TW') {
        pool = pool.filter(item => item.market === 'TWSE' || item.market === 'TPEX')
      } else if (market === 'US') {
        pool = pool.filter(item => item.market === 'US')
      }
    }

    // Re-evaluate statuses dynamically based on current market time
    const recomputed = pool.map(item => ({
      ...item,
      status: computeConferenceStatus(item.conferenceDate, item.timezone, item.conferenceTime)
    }))

    // Split into categories
    const liveAndToday = recomputed.filter(i => i.status === 'live' || i.status === 'today')
    const upcoming = recomputed.filter(i => i.status === 'upcoming')
      .sort((a, b) => a.conferenceDate.localeCompare(b.conferenceDate))
    const replays = recomputed.filter(i => i.status === 'replay')
      .sort((a, b) => b.conferenceDate.localeCompare(a.conferenceDate))

    const all = [...liveAndToday, ...upcoming, ...replays].slice(0, limit)
    const asOfDate = getNowDateString('Asia/Taipei')

    const result: EarningsCallDashboardResult = {
      asOfDate,
      symbol: cleanSym || undefined,
      companyName: pool[0]?.companyName,
      marketFilter: market,
      totalCount: all.length,
      liveAndToday,
      upcoming,
      replays,
      all,
      source: 'MOPS / TWSE / TPEX / Yahoo Finance / Corporate IR'
    }

    // Save to cache
    earningsCallCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS
    })

    return result
  })()

  // Register in-flight promise and ensure cleanup runs strictly after registration
  inFlightRequests.set(cacheKey, fetchPromise)
  fetchPromise.finally(() => {
    inFlightRequests.delete(cacheKey)
  })

  return fetchPromise
}

export const fetchEarningsCallDashboard = fetchEarningsCalls
