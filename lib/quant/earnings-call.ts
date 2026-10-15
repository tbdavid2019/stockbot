import { getEndOfDay } from '../utils.ts'
import { searchWeb2MD } from '../2md.ts'

export interface EarningsCallItem {
  id: string
  symbol: string
  companyName: string
  market: 'TWSE' | 'TPEX' | 'US' | 'JP' | 'KR' | 'OTHER'
  conferenceDate: string // YYYY-MM-DD or '待確認'
  conferenceTime?: string // e.g. "14:00" or "08:30"
  timezone: 'Asia/Taipei' | 'America/New_York' | 'Asia/Tokyo' | 'Asia/Seoul'
  session?: 'before-open' | 'after-close' | 'during-hours' | 'unspecified'
  status: 'live' | 'today' | 'upcoming' | 'replay'
  title: string
  logoUrl?: string // Official corporate logo from BigGo CDN
  hasSlides?: boolean
  hasVideo?: boolean
  hasAudio?: boolean
  hasTranscript?: boolean
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
  marketFilter: 'TW' | 'US' | 'JP' | 'KR' | 'OTHER' | 'ALL'
  totalCount: number
  liveAndToday: EarningsCallItem[]
  upcoming: EarningsCallItem[]
  replays: EarningsCallItem[]
  all: EarningsCallItem[]
  source: string
}

export interface FetchEarningsCallsParams {
  symbol?: string
  market?: 'TW' | 'US' | 'JP' | 'KR' | 'OTHER' | 'ALL'
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
export function getNowDateString(timeZone: 'Asia/Taipei' | 'America/New_York' | string = 'Asia/Taipei'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

/**
 * Parses date and time in a specific timezone into a true UTC Date object
 */
export function parseZonedTimeToUtc(
  dateStr: string,
  timeStr: string | undefined,
  timeZone: string
): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr))
    ? timeStr.split(':').map(Number)
    : [9, 0] // default 09:00 if not specified

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  })
  const parts = formatter.formatToParts(utcGuess)
  const partMap: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = Number(p.value)
  }
  const asLocal = Date.UTC(
    partMap.year,
    partMap.month - 1,
    partMap.day,
    partMap.hour === 24 ? 0 : partMap.hour,
    partMap.minute,
    partMap.second || 0
  )
  const offset = asLocal - utcGuess.getTime()
  return new Date(utcGuess.getTime() - offset)
}

export interface DualTimezoneInfo {
  localDate: string
  localTime: string
  localTzName: string
  localOffsetStr: string
  marketDate: string
  marketTime: string
  marketTzName: string
  isCrossDay: boolean
  dayDiffLabel: string
}

/**
 * Converts conference time to user local timezone and provides dual-timezone display info
 */
export function formatDualTimezone(
  confDate: string,
  confTime: string | undefined,
  marketTz: 'Asia/Taipei' | 'America/New_York' | 'Asia/Tokyo' | 'Asia/Seoul' | string,
  userTz: string = 'Asia/Taipei'
): DualTimezoneInfo {
  let marketTzName = '台北時區 (CST)'
  if (marketTz === 'America/New_York') {
    marketTzName = '美東時區 (ET)'
  } else if (marketTz === 'Asia/Tokyo') {
    marketTzName = '東京時區 (JST)'
  } else if (marketTz === 'Asia/Seoul') {
    marketTzName = '首爾時區 (KST)'
  }
  const localTzName = userTz === 'Asia/Taipei' ? '台北時間 (CST)' : userTz

  const confUtc = parseZonedTimeToUtc(confDate, confTime, marketTz)
  if (!confUtc) {
    return {
      localDate: confDate,
      localTime: confTime || '',
      localTzName,
      localOffsetStr: 'UTC+8',
      marketDate: confDate,
      marketTime: confTime || '',
      marketTzName,
      isCrossDay: false,
      dayDiffLabel: '同日'
    }
  }

  // Format in user local timezone
  const userFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const userParts = userFormatter.formatToParts(confUtc)
  const uMap: Record<string, string> = {}
  for (const p of userParts) if (p.type !== 'literal') uMap[p.type] = p.value
  const localDate = `${uMap.year}-${uMap.month}-${uMap.day}`
  const localTime = `${uMap.hour}:${uMap.minute}`

  // Calculate user timezone offset
  const offsetMinutes = -new Date().getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absM = Math.abs(offsetMinutes)
  const offsetHours = Math.floor(absM / 60)
  const offsetRemM = absM % 60
  const localOffsetStr = `UTC${sign}${offsetHours}${offsetRemM > 0 ? `:${offsetRemM.toString().padStart(2, '0')}` : ''}`

  const isCrossDay = localDate !== confDate
  const dayDiffLabel = isCrossDay ? (localDate > confDate ? '+1天 (次日)' : '-1天 (前一日)') : '同日'

  return {
    localDate,
    localTime,
    localTzName,
    localOffsetStr,
    marketDate: confDate,
    marketTime: confTime || '',
    marketTzName,
    isCrossDay,
    dayDiffLabel
  }
}

/**
 * Determines conference status relative to market timezone, user timezone, and exact current UTC time
 */
export function computeConferenceStatus(
  confDate: string,
  timeZone: 'Asia/Taipei' | 'America/New_York' | 'Asia/Tokyo' | 'Asia/Seoul' | string,
  confTime?: string,
  now: Date = new Date(),
  userTimeZone: string = 'Asia/Taipei'
): 'live' | 'today' | 'upcoming' | 'replay' {
  if (!confDate || confDate === '待確認' || !/^\d{4}-\d{2}-\d{2}$/.test(confDate)) {
    return 'upcoming'
  }

  const confTodayStr = getNowDateString(timeZone)
  const userTodayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)

  const confUtc = parseZonedTimeToUtc(confDate, confTime, timeZone)

  // 1. Live status check: within -15 to +120 minutes of scheduled start time
  if (confUtc) {
    const diffMs = now.getTime() - confUtc.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    if (diffMinutes >= -15 && diffMinutes <= 120) {
      return 'live'
    }
  }

  // 2. Calendar date alignment relative to viewer's current date:
  if (confDate === userTodayStr) {
    return 'today'
  }

  // 3. Future dates
  if (confDate > userTodayStr) {
    return 'upcoming'
  }

  // 4. Past dates (yesterday or earlier)
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
    webcastUrl: 'https://investor.tsmc.com/chinese/quarterly-results',
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
    irUrl: 'https://corp.mediatek.tw/investor-relations',
    guidanceHighlights: {
      revenueOutlook: '旗艦天璣晶片出貨展望待法說會正式揭曉',
      marginOutlook: '目標毛利率區建待管理層於法說會中更新',
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
    irUrl: 'https://www.quantatw.com/Quanta/chinese/investor',
    guidanceHighlights: {
      revenueOutlook: '伺服器出貨展望依會議簡報公佈為準',
      marginOutlook: '高階 AI 機櫃解決方案毛利表現待確認'
    }
  },
  {
    id: 'tw-1203-2026q3',
    symbol: '1203',
    companyName: '味王 (Ve Wong)',
    market: 'TWSE',
    conferenceDate: '2026-10-14',
    conferenceTime: '14:30',
    timezone: 'Asia/Taipei',
    session: 'during-hours',
    status: 'today',
    title: '味王 2026 年第三季法人說明會',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '臺灣證券交易所 1 樓資訊展示中心 / WebPro 影音傳播網',
    webcastUrl: 'https://webpro.twse.com.tw/WebPortal/schedule',
    irUrl: 'https://www.vewong.com',
    guidanceHighlights: {
      revenueOutlook: '說明公司概況、營運現況與調味品/食品內外銷展望',
      highlights: ['海外東南亞事業拓展與台灣食品製造產能展望']
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
    irUrl: 'https://www.aseglobal.com'
  },
  {
    id: 'tw-3035-2026q3',
    symbol: '3035',
    companyName: '智原 (Faraday)',
    market: 'TWSE',
    conferenceDate: '2026-10-27',
    conferenceTime: '14:00',
    timezone: 'Asia/Taipei',
    session: 'during-hours',
    status: 'upcoming',
    title: '智原科技 2026 年第三季線上法人說明會',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '全球線上直播 (Webcast · 詳洽官網公告)',
    irUrl: 'https://www.faraday-tech.com/tw/content/IR/InvestorConference',
    guidanceHighlights: {
      revenueOutlook: '先進製程與客製化 ASIC 委託設計 (NRE) 成長動能指引公布',
      highlights: [
        'FinFET 先進製程與 3D 封裝 IP 授權展望',
        '邊緣端 AI 與車載晶片專案量產進度'
      ]
    }
  },
  {
    id: 'tw-2303-2026q3',
    symbol: '2303',
    companyName: '聯電 (UMC)',
    market: 'TWSE',
    conferenceDate: '2026-10-28',
    conferenceTime: '17:00',
    timezone: 'Asia/Taipei',
    session: 'after-close',
    status: 'upcoming',
    title: '聯華電子 2026 年第三季線上法人說明會',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '線上電話會議 (Global Audio Webcast)',
    irUrl: 'https://www.umc.com/zh-TW/investors',
    guidanceHighlights: {
      revenueOutlook: '成熟製程產能利用率與晶圓代工報價指引',
      highlights: ['特殊製程 22/28nm 需求與新加坡新廠產能擴充時程']
    }
  },
  {
    id: 'tw-3008-2026q3',
    symbol: '3008',
    companyName: '大立光 (Largan)',
    market: 'TWSE',
    conferenceDate: '2026-10-08',
    conferenceTime: '14:30',
    timezone: 'Asia/Taipei',
    session: 'during-hours',
    status: 'replay',
    title: '大立光電 2026 年第三季線上法人說明會 (歷史回放)',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '線上會議 (Audio Webcast)',
    irUrl: 'https://www.largan.com.tw',
    guidanceHighlights: {
      revenueOutlook: '第四季旗艦手機潛望鏡頭拉貨動能評述',
      highlights: ['高階鏡頭規格升級與產能稼動率展望']
    }
  },
  // --- 🇺🇸 美國重要科技股與指數成分股 Earnings Call ---
  {
    id: 'us-bac-2026q3',
    symbol: 'BAC',
    companyName: '美國銀行 (Bank of America)',
    market: 'US',
    conferenceDate: '2026-10-14',
    conferenceTime: '08:30',
    timezone: 'America/New_York',
    session: 'before-open',
    status: 'today',
    title: 'Bank of America Q3 2026 Financial Results Conference Call',
    financialPeriod: '2026 Q3',
    locationOrPlatform: 'Live Webcast & Conference Call',
    webcastUrl: 'https://investor.bankofamerica.com/events-and-presentations',
    irUrl: 'https://investor.bankofamerica.com',
    guidanceHighlights: {
      revenueOutlook: '淨利息收入 (NII) 與投資銀行承銷手續費營收指引',
      highlights: [
        '聯準會降息循環下之存放款利差與資產品質展望',
        '財富管理與機構交易業務淨流入成長'
      ]
    }
  },
  {
    id: 'us-jnj-2026q3',
    symbol: 'JNJ',
    companyName: '嬌生 (Johnson & Johnson)',
    market: 'US',
    conferenceDate: '2026-10-14',
    conferenceTime: '08:30',
    timezone: 'America/New_York',
    session: 'before-open',
    status: 'today',
    title: 'Johnson & Johnson Q3 2026 Results Conference Call & Webcast',
    financialPeriod: '2026 Q3',
    locationOrPlatform: 'Live Audio Webcast',
    webcastUrl: 'https://www.investor.jnj.com/events-and-presentations',
    irUrl: 'https://www.investor.jnj.com',
    guidanceHighlights: {
      revenueOutlook: '創新生理藥物與醫療科技 (MedTech) 全年營收指引更新',
      highlights: ['腫瘤學管線藥物商業化與全球市場滲透率']
    }
  },
  {
    id: 'us-unh-2026q3',
    symbol: 'UNH',
    companyName: '聯合健康 (UnitedHealth Group)',
    market: 'US',
    conferenceDate: '2026-10-14',
    conferenceTime: '08:45',
    timezone: 'America/New_York',
    session: 'before-open',
    status: 'today',
    title: 'UnitedHealth Group 2026 Q3 Earnings Conference Call',
    financialPeriod: '2026 Q3',
    locationOrPlatform: 'Live Audio Webcast',
    webcastUrl: 'https://www.unitedhealthgroup.com/investors.html',
    irUrl: 'https://www.unitedhealthgroup.com/investors.html',
    guidanceHighlights: {
      revenueOutlook: '醫療照護比率 (MLR) 預期區間與 Optum 業務成長展望',
      highlights: ['Medicare Advantage 會員數增長與價值導向醫療支出管控']
    }
  },
  {
    id: 'us-ms-2026q3',
    symbol: 'MS',
    companyName: '摩根士丹利 (Morgan Stanley)',
    market: 'US',
    conferenceDate: '2026-10-14',
    conferenceTime: '09:30',
    timezone: 'America/New_York',
    session: 'before-open',
    status: 'today',
    title: 'Morgan Stanley Third Quarter 2026 Earnings Conference Call',
    financialPeriod: '2026 Q3',
    locationOrPlatform: 'Live Webcast',
    webcastUrl: 'https://www.morganstanley.com/about-us-ir',
    irUrl: 'https://www.morganstanley.com/about-us-ir',
    guidanceHighlights: {
      revenueOutlook: 'IPO 資本市場復甦與併購諮詢 (M&A) 手續費指引',
      highlights: ['財富管理客戶資產管理規模 (AUM) 與新資金淨流入速度']
    }
  },
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
    webcastUrl: 'https://investor.nvidia.com/events-and-presentations/default.aspx',
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
    webcastUrl: 'https://www.spacex.com',
    irUrl: 'https://www.spacex.com',
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
    webcastUrl: 'https://www.microsoft.com/en-us/investor/events/default.aspx',
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
    irUrl: 'https://ir.tesla.com'
  },
  // --- 🇯🇵 日本代表性企業法說會 (JPX) ---
  {
    id: 'jp-7203-2026',
    symbol: '7203',
    companyName: '豐田汽車 (Toyota Motor)',
    market: 'JP',
    conferenceDate: '2026-10-30',
    conferenceTime: '15:00',
    timezone: 'Asia/Tokyo',
    session: 'after-close',
    status: 'upcoming',
    title: 'トヨタ自動車 2026年度 第2四半期 決算説明会',
    financialPeriod: 'FY2026 Q2',
    locationOrPlatform: '東京總部 / Online Audio & Video Webcast',
    webcastUrl: 'https://global.toyota/jp/ir/',
    irUrl: 'https://global.toyota/jp/ir/',
    guidanceHighlights: {
      revenueOutlook: '全球油電混合車 (HEV) 與電動車出貨目標與獲利指引',
      highlights: ['北美與亞洲市場供應鏈庫存調整', '次世代固態電池研發進度']
    }
  },
  {
    id: 'jp-9984-2026',
    symbol: '9984',
    companyName: '軟銀集團 (SoftBank Group)',
    market: 'JP',
    conferenceDate: '2026-11-10',
    conferenceTime: '16:30',
    timezone: 'Asia/Tokyo',
    session: 'after-close',
    status: 'upcoming',
    title: 'ソフトバンクグループ 2026年度 第2四半期 決算説明会',
    financialPeriod: 'FY2026 Q2',
    locationOrPlatform: '東京總部直播 (Live Webcast)',
    webcastUrl: 'https://group.softbank/ir',
    irUrl: 'https://group.softbank/ir',
    guidanceHighlights: {
      revenueOutlook: '願景基金 (Vision Fund) 投資收益與 AI 半導體生態系佈局',
      highlights: ['Arm 授權營收增長動能', '生成式 AI 超級運算中心資本配置']
    }
  },
  // --- 🇰🇷 韓國代表性企業法說會 (KRX) ---
  {
    id: 'kr-005930-2026',
    symbol: '005930',
    companyName: '三星電子 (Samsung Electronics)',
    market: 'KR',
    conferenceDate: '2026-10-31',
    conferenceTime: '10:00',
    timezone: 'Asia/Seoul',
    session: 'before-open',
    status: 'upcoming',
    title: '삼성전자 2026년 3분기 경영실적 설명회 (Earnings Call)',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '수원 본사 / Global Audio Webcast',
    webcastUrl: 'https://www.samsung.com/global/ir/',
    irUrl: 'https://www.samsung.com/global/ir/',
    guidanceHighlights: {
      revenueOutlook: '高頻寬記憶體 (HBM3E / HBM4) 供貨與晶圓代工 (Foundry) 產能展望',
      highlights: ['次世代 2nm 製程導入進度', '旗艦 Galaxy AI 手機出貨目標']
    }
  },
  {
    id: 'kr-000660-2026',
    symbol: '000660',
    companyName: 'SK 海力士 (SK Hynix)',
    market: 'KR',
    conferenceDate: '2026-10-24',
    conferenceTime: '09:00',
    timezone: 'Asia/Seoul',
    session: 'before-open',
    status: 'upcoming',
    title: 'SK하이닉스 2026년 3분기 실적발표 컨퍼런스콜',
    financialPeriod: '2026 Q3',
    locationOrPlatform: '이천 본사 / Global Audio Conference Call',
    webcastUrl: 'https://www.skhynix.com/ir',
    irUrl: 'https://www.skhynix.com/ir',
    guidanceHighlights: {
      revenueOutlook: 'HBM3E 12層堆疊放量與 DRAM/NAND 晶圓產能稼動率',
      highlights: ['AI 伺服器客戶訂單能見度至 2027 年', '清州與龍仁新晶圓廠投資時程']
    }
  }
]

/**
 * BigGo Finance API Configuration
 * Endpoint: https://api.biggo.com/api/v1/finance/stock/earnings-calls
 */
const BIGGO_API_BASE = 'https://api.biggo.com/api/v1/finance'
const BIGGO_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  Site: 'finance.biggo.com.tw',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

export interface BigGoRawCallItem {
  call_id: string
  title: string
  stock_id?: string
  region?: string
  asset_type?: string
  name?: string
  image?: string | null
  date: string
  duration?: number | null
  has_video?: boolean
  has_audio?: boolean
  has_slides?: boolean
  has_transcript?: boolean
}

export interface BigGoCallDetail {
  call_id: string
  date: string
  title: string
  duration?: number | null
  summary?: string
  takeaways?: string
  outlook?: string
  qa_highlights?: string
  financial_highlights?: string
  news?: {
    title?: string
    summary?: string
    image?: string
    header_og_image?: string
  }
}

/**
 * Normalizes stock code, market type, and timezone from BigGo raw call item
 */
function parseBigGoStockMetadata(item: BigGoRawCallItem): {
  symbol: string
  market: 'TWSE' | 'TPEX' | 'US' | 'JP' | 'KR' | 'OTHER'
  timezone: 'Asia/Taipei' | 'America/New_York' | 'Asia/Tokyo' | 'Asia/Seoul'
} {
  const stockId = (item.stock_id || '').toUpperCase().trim()
  const region = (item.region || '').toLowerCase().trim()
  const title = item.title || ''

  if (stockId === 'SPCX' || title.includes('SPCX') || title.includes('SpaceX') || title.includes('太空探索')) {
    return {
      symbol: 'SPCX',
      market: 'US',
      timezone: 'America/New_York'
    }
  }

  // Japan stocks (e.g. 7203.T, 9984.T, region === 'jp')
  if (region === 'jp' || stockId.endsWith('.T')) {
    return {
      symbol: stockId.replace('.T', ''),
      market: 'JP',
      timezone: 'Asia/Tokyo'
    }
  }

  // South Korea stocks (e.g. 005930.KS, 000660.KS, region === 'kr')
  if (region === 'kr' || stockId.endsWith('.KS') || stockId.endsWith('.KQ')) {
    return {
      symbol: stockId.replace(/\.(KS|KQ)$/, ''),
      market: 'KR',
      timezone: 'Asia/Seoul'
    }
  }

  if (stockId.endsWith('.TWO')) {
    return {
      symbol: stockId.replace('.TWO', ''),
      market: 'TPEX',
      timezone: 'Asia/Taipei'
    }
  }
  if (stockId.endsWith('.TW')) {
    return {
      symbol: stockId.replace('.TW', ''),
      market: 'TWSE',
      timezone: 'Asia/Taipei'
    }
  }
  if (region === 'tw' || /^\d{4}$/.test(stockId)) {
    return {
      symbol: stockId || 'TWSE',
      market: 'TWSE',
      timezone: 'Asia/Taipei'
    }
  }
  if (region === 'us' || /^[A-Z]{1,5}$/.test(stockId)) {
    return {
      symbol: stockId || 'US',
      market: 'US',
      timezone: 'America/New_York'
    }
  }
  return {
    symbol: stockId || 'OTHER',
    market: 'OTHER',
    timezone: 'Asia/Taipei'
  }
}

/**
 * Extracts financial period string (e.g. "FY2027 Q2", "2026 Q3") from title or date
 */
function extractFinancialPeriod(title: string, date: string): string | undefined {
  if (!title) return undefined

  // Match e.g. FY2027 第二季 / FY2026 第四季 / 2026會計年度第三季 / 2027財年第二季
  const fyZhMatch = title.match(/(?:FY)?(202\d)\s*(?:會計年度|財年|年度)?\s*第([一二三四1-4])季/)
  if (fyZhMatch) {
    const qMap: Record<string, string> = {
      '一': 'Q1',
      '二': 'Q2',
      '三': 'Q3',
      '四': 'Q4',
      '1': 'Q1',
      '2': 'Q2',
      '3': 'Q3',
      '4': 'Q4'
    }
    return `FY${fyZhMatch[1]} ${qMap[fyZhMatch[2]] || fyZhMatch[2]}`
  }

  // Match e.g. Q3 2026 or 2026 Q3
  const qEnMatch = title.match(/(?:Q([1-4])\s*(?:FY)?(202\d)|(?:FY)?(202\d)\s*Q([1-4]))/i)
  if (qEnMatch) {
    if (qEnMatch[1] && qEnMatch[2]) {
      return `${qEnMatch[2]} Q${qEnMatch[1]}`
    }
    if (qEnMatch[3] && qEnMatch[4]) {
      return `${qEnMatch[3]} Q${qEnMatch[4]}`
    }
  }

  // Fallback to quarter from conference date if year is 2024-2029
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m] = date.split('-').map(Number)
    const q = Math.ceil(m / 3)
    return `${y} Q${q}`
  }

  return undefined
}

/**
 * Parses executive guidance, revenue targets, gross margin, and capex from BigGo detail
 */
function parseBigGoGuidance(detail?: BigGoCallDetail | null): EarningsCallItem['guidanceHighlights'] | undefined {
  if (!detail) return undefined

  const outlookText = detail.outlook || ''
  const takeawaysText = detail.takeaways || detail.summary || ''

  // Margin pattern: 毛利率 or Gross Margin
  const marginMatch = outlookText.match(/(?:毛利率|Gross Margin)[：:]\s*([^\n]+)/i)
  // Capex pattern: 資本支出 or CapEx or Capital Expenditures
  const capexMatch = outlookText.match(/(?:資本支出|CapEx|Capital Expenditures)[：:]\s*([^\n]+)/i)
  // Revenue pattern: 營收 or Revenue
  const revMatch = outlookText.match(/(?:營收|Revenue)[：:]\s*([^\n]+)/i)

  const highlights: string[] = []
  if (takeawaysText) {
    const lines = takeawaysText
      .split('\n')
      .map(l => l.replace(/^[-*•\d.]\s*/, '').trim())
      .filter(l => l.length > 5 && !l.startsWith('#'))
    highlights.push(...lines.slice(0, 5))
  }

  const revenueOutlook = revMatch
    ? `營收展望：${revMatch[1].trim()}`
    : (outlookText.split('\n')[0]?.trim() || undefined)

  const marginOutlook = marginMatch
    ? `毛利率目標：${marginMatch[1].trim()}`
    : undefined

  const capexOutlook = capexMatch
    ? `資本支出規劃：${capexMatch[1].trim()}`
    : undefined

  if (!revenueOutlook && !marginOutlook && !capexOutlook && highlights.length === 0) {
    return undefined
  }

  return {
    revenueOutlook,
    marginOutlook,
    capexOutlook,
    highlights: highlights.length > 0 ? highlights : undefined
  }
}

/**
 * Maps a BigGo raw call item into a unified EarningsCallItem
 */
function mapBigGoItemToEarningsCall(
  item: BigGoRawCallItem,
  detail?: BigGoCallDetail | null,
  slidesUrl?: string,
  videoUrl?: string
): EarningsCallItem {
  const meta = parseBigGoStockMetadata(item)
  const financialPeriod = extractFinancialPeriod(item.title, item.date)
  const guidance = parseBigGoGuidance(detail)

  const isTw = meta.timezone === 'Asia/Taipei'
  const defaultConfTime = isTw ? '14:00' : '17:00'
  const session = isTw ? 'during-hours' : 'after-close'
  const status = computeConferenceStatus(item.date, meta.timezone, defaultConfTime)

  const locationOrPlatform = item.has_video
    ? '線上視訊會議 (Video Webcast)'
    : item.has_audio
    ? '線上電話會議 (Audio Webcast)'
    : '法人說明會 (實體/線上同步)'

  return {
    id: item.call_id,
    symbol: meta.symbol,
    companyName: item.name || item.title.replace(/\s*(?:202\d|FY202\d).+$/, '').trim() || meta.symbol,
    market: meta.market,
    conferenceDate: item.date,
    conferenceTime: defaultConfTime,
    timezone: meta.timezone,
    session,
    status,
    title: item.title,
    logoUrl: item.image || undefined,
    hasSlides: item.has_slides,
    hasVideo: item.has_video,
    hasAudio: item.has_audio,
    hasTranscript: item.has_transcript,
    financialPeriod,
    locationOrPlatform,
    webcastUrl: videoUrl || undefined,
    presentationDeckUrl: slidesUrl || undefined,
    irUrl: `https://finance.biggo.com.tw/earnings-call?q=${encodeURIComponent(item.stock_id || meta.symbol)}`,
    guidanceHighlights: guidance
  }
}

/**
 * Enriches a BigGo raw call item with detail, presentation slides PDF, and video webcast URL
 */
async function enrichBigGoCallItem(item: BigGoRawCallItem): Promise<EarningsCallItem> {
  const promises: Promise<any>[] = []

  // 1. Fetch detail (summary, outlook, QA)
  const detailUrl = `${BIGGO_API_BASE}/stock/earnings-calls/detail?call_id=${encodeURIComponent(item.call_id)}&stock_id=${encodeURIComponent(item.stock_id || '')}&region=tw`
  promises.push(
    fetch(detailUrl, {
      headers: BIGGO_HEADERS,
      signal: AbortSignal.timeout(3000)
    })
      .then(r => (r.ok ? r.json() : null))
      .then(j => j?.data as BigGoCallDetail | undefined)
      .catch(() => null)
  )

  // 2. Fetch slides if flagged
  if (item.has_slides) {
    const slidesUrl = `${BIGGO_API_BASE}/stock/earnings-calls/file?type=slides&call_id=${encodeURIComponent(item.call_id)}&region=tw`
    promises.push(
      fetch(slidesUrl, {
        headers: BIGGO_HEADERS,
        signal: AbortSignal.timeout(3000)
      })
        .then(r => (r.ok ? r.json() : null))
        .then(j => (j?.data?.list?.[0]?.url || j?.data?.url) as string | undefined)
        .catch(() => null)
    )
  } else {
    promises.push(Promise.resolve(null))
  }

  // 3. Fetch video if flagged
  if (item.has_video) {
    const videoUrl = `${BIGGO_API_BASE}/stock/earnings-calls/file?type=video&call_id=${encodeURIComponent(item.call_id)}&region=tw`
    promises.push(
      fetch(videoUrl, {
        headers: BIGGO_HEADERS,
        signal: AbortSignal.timeout(3000)
      })
        .then(r => (r.ok ? r.json() : null))
        .then(j => j?.data?.url as string | undefined)
        .catch(() => null)
    )
  } else {
    promises.push(Promise.resolve(null))
  }

  const [detail, slidesUrl, videoUrl] = await Promise.all(promises)
  return mapBigGoItemToEarningsCall(item, detail, slidesUrl, videoUrl)
}

/**
 * Fetches earnings calls from BigGo Finance for a specific stock ticker or query
 */
async function fetchBigGoEarningsBySymbol(query: string): Promise<EarningsCallItem[]> {
  try {
    const isTw4 = /^\d{4}$/.test(query)
    const tasks: Promise<BigGoRawCallItem[]>[] = []

    // 1. General search query
    tasks.push(
      fetch(`${BIGGO_API_BASE}/stock/earnings-calls/list?q=${encodeURIComponent(query)}&page=1&size=50`, {
        headers: BIGGO_HEADERS,
        signal: AbortSignal.timeout(4000)
      })
        .then(r => (r.ok ? r.json() : null))
        .then(j => (j?.data?.list || []) as BigGoRawCallItem[])
        .catch(() => [])
    )

    // 2. Direct TW stock ID endpoint if 4 digits
    if (isTw4) {
      tasks.push(
        fetch(`${BIGGO_API_BASE}/stock/${query}.TW/earnings-calls/list?region=tw`, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
          .then(r => (r.ok ? r.json() : null))
          .then(j => (j?.data?.list || []) as BigGoRawCallItem[])
          .catch(() => [])
      )
    }

    const lists = await Promise.all(tasks)
    const map = new Map<string, BigGoRawCallItem>()
    for (const list of lists) {
      for (const item of list) {
        if (!map.has(item.call_id)) {
          map.set(item.call_id, item)
        }
      }
    }

    const rawItems = Array.from(map.values())
    if (rawItems.length === 0) return []

    // Enrich top 3 items with complete guidance highlights, slide PDFs, and video links
    const topEnriched = await Promise.all(rawItems.slice(0, 3).map(enrichBigGoCallItem))
    const restMapped = rawItems.slice(3).map(i => mapBigGoItemToEarningsCall(i))

    return [...topEnriched, ...restMapped]
  } catch (err) {
    console.warn('[EarningsCall] fetchBigGoEarningsBySymbol error:', err)
    return []
  }
}

/**
 * Fetches multi-window earnings call dashboard from BigGo Finance (-18 days to +18 days)
 */
async function fetchBigGoMultiWindowDashboard(
  market?: 'TW' | 'US' | 'JP' | 'KR' | 'OTHER' | 'ALL'
): Promise<EarningsCallItem[]> {
  try {
    const today = new Date()
    const windows: { start: string; end: string }[] = []

    // 6 windows of 6-day spans: -18 to +18 days
    for (let i = -3; i < 3; i++) {
      const s = new Date(today.getTime() + i * 6 * 86400000)
      const e = new Date(today.getTime() + (i + 1) * 6 * 86400000)
      windows.push({
        start: s.toISOString().split('T')[0],
        end: e.toISOString().split('T')[0]
      })
    }

    let marketParam = ''
    if (market === 'TW') marketParam = '&market=tw'
    else if (market === 'US') marketParam = '&market=us'
    else if (market === 'JP') marketParam = '&market=jp'
    else if (market === 'KR') marketParam = '&market=kr'
    else if (market === 'OTHER') marketParam = '&market=other'

    const fetchWindow = async (w: { start: string; end: string }) => {
      try {
        const url = `${BIGGO_API_BASE}/stock/earnings-calls/list?start_date=${w.start}&end_date=${w.end}${marketParam}`
        const res = await fetch(url, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
        if (!res.ok) return []
        const json = await res.json()
        return (json?.data?.list || []) as BigGoRawCallItem[]
      } catch {
        return []
      }
    }

    const pageTasks: Promise<BigGoRawCallItem[]>[] = []
    if (!market || market === 'ALL') {
      pageTasks.push(
        fetch(`${BIGGO_API_BASE}/stock/earnings-calls/list?page=1&size=100`, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
          .then(res => (res.ok ? res.json() : null))
          .then(json => (json?.data?.list || []) as BigGoRawCallItem[])
          .catch(() => []),
        fetch(`${BIGGO_API_BASE}/stock/earnings-calls/list?page=1&size=60&market=tw`, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
          .then(res => (res.ok ? res.json() : null))
          .then(json => (json?.data?.list || []) as BigGoRawCallItem[])
          .catch(() => []),
        fetch(`${BIGGO_API_BASE}/stock/earnings-calls/list?page=1&size=60&market=us`, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
          .then(res => (res.ok ? res.json() : null))
          .then(json => (json?.data?.list || []) as BigGoRawCallItem[])
          .catch(() => []),
        fetch(`${BIGGO_API_BASE}/stock/earnings-calls/list?page=1&size=60&market=jp`, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
          .then(res => (res.ok ? res.json() : null))
          .then(json => (json?.data?.list || []) as BigGoRawCallItem[])
          .catch(() => []),
        fetch(`${BIGGO_API_BASE}/stock/earnings-calls/list?page=1&size=40&market=kr`, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
          .then(res => (res.ok ? res.json() : null))
          .then(json => (json?.data?.list || []) as BigGoRawCallItem[])
          .catch(() => [])
      )
    } else {
      pageTasks.push(
        fetch(`${BIGGO_API_BASE}/stock/earnings-calls/list?page=1&size=100${marketParam}`, {
          headers: BIGGO_HEADERS,
          signal: AbortSignal.timeout(4000)
        })
          .then(res => (res.ok ? res.json() : null))
          .then(json => (json?.data?.list || []) as BigGoRawCallItem[])
          .catch(() => [])
      )
    }

    const [allPageLists, ...windowLists] = await Promise.all([
      Promise.all(pageTasks),
      ...windows.map(fetchWindow)
    ])
    const map = new Map<string, BigGoRawCallItem>()
    for (const list of allPageLists) {
      for (const item of list) {
        if (!map.has(item.call_id)) {
          map.set(item.call_id, item)
        }
      }
    }
    for (const list of windowLists) {
      for (const item of list) {
        if (!map.has(item.call_id)) {
          map.set(item.call_id, item)
        }
      }
    }

    const rawItems = Array.from(map.values())
    if (rawItems.length === 0) return []

    // Sort chronologically to identify upcoming and live calls
    const mapped = rawItems.map(i => mapBigGoItemToEarningsCall(i))
    const liveOrUpcoming = mapped.filter(i => i.status === 'live' || i.status === 'today' || i.status === 'upcoming')

    // Enrich top 5 most urgent calls with guidance and slide PDFs
    const urgentCallIds = new Set(liveOrUpcoming.slice(0, 5).map(i => i.id))
    const enrichedResults = await Promise.all(
      rawItems.map(item => {
        if (urgentCallIds.has(item.call_id)) {
          return enrichBigGoCallItem(item)
        }
        return Promise.resolve(mapBigGoItemToEarningsCall(item))
      })
    )

    return enrichedResults
  } catch (err) {
    console.warn('[EarningsCall] fetchBigGoMultiWindowDashboard error:', err)
    return []
  }
}

/**
 * Searches live 2MD web for recent or upcoming earnings call announcements (fallback)
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
  const { symbol, market = 'ALL', limit = 250 } = params
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
    let pool: EarningsCallItem[] = []

    if (cleanSym) {
      // --- Targeted Symbol Query ---
      const [bigGoItems, verifiedMatches] = await Promise.all([
        fetchBigGoEarningsBySymbol(cleanSym),
        Promise.resolve(
          VERIFIED_CORPORATE_EARNINGS.filter(item => {
            return (
              item.symbol.toUpperCase() === cleanSym ||
              item.companyName.toUpperCase() === cleanSym ||
              (cleanSym.length >= 2 && item.companyName.toUpperCase().includes(cleanSym))
            )
          })
        )
      ])

      // Combine BigGo live results + verified benchmarks (deduplicating by symbol + date)
      const mergedMap = new Map<string, EarningsCallItem>()
      for (const item of bigGoItems) {
        const key = `${item.symbol}_${item.conferenceDate}`
        mergedMap.set(key, item)
      }
      for (const item of verifiedMatches) {
        const key = `${item.symbol}_${item.conferenceDate}`
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item)
        } else {
          // Enrich BigGo item with hardcoded high-fidelity IR links if missing
          const existing = mergedMap.get(key)!
          mergedMap.set(key, {
            ...existing,
            webcastUrl: existing.webcastUrl || item.webcastUrl,
            presentationDeckUrl: existing.presentationDeckUrl || item.presentationDeckUrl,
            irUrl: item.irUrl || existing.irUrl,
            guidanceHighlights: existing.guidanceHighlights || item.guidanceHighlights
          })
        }
      }

      pool = Array.from(mergedMap.values())

      // Fallback to 2MD search if neither returned results
      if (pool.length === 0) {
        const sanitizedSymbol = cleanSym.replace(/[^\w\u4e00-\u9fa5]/g, '')
        const searchQuery = `${sanitizedSymbol} 法人說明會 OR earnings call 2026 簡報 日程`
        pool = await searchLiveEarningsAnnouncements(searchQuery)
      }
    } else {
      // --- General Dashboard Query (Multi-window BigGo + Verified directory) ---
      const [bigGoDashboardItems] = await Promise.all([
        fetchBigGoMultiWindowDashboard(market)
      ])

      const mergedMap = new Map<string, EarningsCallItem>()

      // 1. Add BigGo items
      for (const item of bigGoDashboardItems) {
        const key = `${item.symbol}_${item.conferenceDate}`
        mergedMap.set(key, item)
      }

      // 2. Add verified corporate earnings benchmark directory
      for (const item of VERIFIED_CORPORATE_EARNINGS) {
        const key = `${item.symbol}_${item.conferenceDate}`
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item)
        } else {
          const existing = mergedMap.get(key)!
          mergedMap.set(key, {
            ...existing,
            webcastUrl: existing.webcastUrl || item.webcastUrl,
            presentationDeckUrl: existing.presentationDeckUrl || item.presentationDeckUrl,
            irUrl: item.irUrl || existing.irUrl,
            guidanceHighlights: existing.guidanceHighlights || item.guidanceHighlights
          })
        }
      }

      pool = Array.from(mergedMap.values())
    }

    // Filter by market if specified
    if (market !== 'ALL') {
      if (market === 'TW') {
        pool = pool.filter(item => item.market === 'TWSE' || item.market === 'TPEX')
      } else if (market === 'US') {
        pool = pool.filter(item => item.market === 'US')
      } else if (market === 'JP') {
        pool = pool.filter(item => item.market === 'JP')
      } else if (market === 'KR') {
        pool = pool.filter(item => item.market === 'KR')
      } else if (market === 'OTHER') {
        pool = pool.filter(item => item.market === 'OTHER')
      }
    }

    // Re-evaluate statuses dynamically based on current market time
    const recomputed = pool.map(item => ({
      ...item,
      status: computeConferenceStatus(item.conferenceDate, item.timezone, item.conferenceTime)
    }))

    // Split into categories
    const liveAndToday = recomputed.filter(i => i.status === 'live' || i.status === 'today')
    const upcoming = recomputed
      .filter(i => i.status === 'upcoming')
      .sort((a, b) => a.conferenceDate.localeCompare(b.conferenceDate))
    const replays = recomputed
      .filter(i => i.status === 'replay')
      .sort((a, b) => b.conferenceDate.localeCompare(a.conferenceDate))

    const all = [...liveAndToday, ...upcoming, ...replays].slice(0, limit)
    const asOfDate = getNowDateString('Asia/Taipei')

    const result: EarningsCallDashboardResult = {
      asOfDate,
      symbol: cleanSym || undefined,
      companyName: cleanSym ? pool[0]?.companyName : undefined,
      marketFilter: market,
      totalCount: all.length,
      liveAndToday,
      upcoming,
      replays,
      all,
      source: 'BigGo Finance / MOPS / TWSE / TPEX / Yahoo Finance / Corporate IR'
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

