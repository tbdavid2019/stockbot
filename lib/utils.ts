import { clsx, type ClassValue } from 'clsx'
import { customAlphabet } from 'nanoid'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  7
) // 7-character random string

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  if (!res.ok) {
    const json = await res.json()
    if (json.error) {
      const error = new Error(json.error) as Error & {
        status: number
      }
      error.status = res.status
      throw error
    } else {
      throw new Error('An unexpected error occurred')
    }
  }

  return res.json()
}

export function formatDate(input: string | number | Date): string {
  const date = new Date(input)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)

export const runAsyncFnWithoutBlocking = (
  fn: (...args: any) => Promise<any>
) => {
  fn()
}

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const getStringFromBuffer = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

export enum ResultCode {
  InvalidCredentials = 'INVALID_CREDENTIALS',
  InvalidSubmission = 'INVALID_SUBMISSION',
  UserAlreadyExists = 'USER_ALREADY_EXISTS',
  UnknownError = 'UNKNOWN_ERROR',
  UserCreated = 'USER_CREATED',
  UserLoggedIn = 'USER_LOGGED_IN'
}

export const getMessageFromCode = (resultCode: string) => {
  switch (resultCode) {
    case ResultCode.InvalidCredentials:
      return 'Invalid credentials!'
    case ResultCode.InvalidSubmission:
      return 'Invalid submission, please try again!'
    case ResultCode.UserAlreadyExists:
      return 'User already exists, please log in!'
    case ResultCode.UserCreated:
      return 'User created, welcome!'
    case ResultCode.UnknownError:
      return 'Something went wrong, please try again!'
    case ResultCode.UserLoggedIn:
      return 'Logged in!'
  }
}

/**
 * 格式化股票代號，特別處理台灣股票代號
 * @param symbol 原始股票代號
 * @returns 格式化後的股票代號
 */
// export function formatStockSymbol(symbol: string): string {
//   // 檢查是否為純數字台灣股票代號（如 2330）
//   if (/^\d{4,}$/.test(symbol)) {
//     return `TWSE:${symbol}`;
//   }
//   // 如果已經包含 TWSE: 或 TPE: 前綴，則轉換冒號為 %3A
//   if (symbol.startsWith('TWSE:')) {
//     return symbol.replace('TWSE:', 'TWSE%3A');
//   }
//   if (symbol.startsWith('TPE:')) {
//     return symbol.replace('TPE:', 'TPE%3A');
//   }
//   // 檢查是否為 .TW 結尾
//   // if (symbol.endsWith('.TW')) {
//   //   return symbol;
//   // }
//   return symbol;
// }
export function formatStockSymbol(symbol: string): string {
  if (!symbol) return ''
  let trimmed = symbol.trim()

  // 0. 如果字串中含有全形或半形括號包裹的股票代碼，例如 "Mosaic Co/The (MOS)" 或 "旭隼（6409）" 或 "MetLife (MET)"
  const bracketMatch = trimmed.match(/[\(（]([A-Za-z0-9.:_-]+)[\)）]/)
  if (bracketMatch) {
    const inside = bracketMatch[1].trim()
    if (inside.length >= 1 && inside.length <= 10) {
      trimmed = inside
    }
  }

  // 移除所有內部與兩端空格
  trimmed = trimmed.replace(/\s+/g, '').toUpperCase()

  // 常見公司名稱先轉成 TradingView 可辨識的交易所代號。
  const stockAliases: Record<string, string> = {
    台積電: 'TWSE:2330',
    TSMC: 'TWSE:2330',
    聯電: 'TWSE:2303',
    鴻海: 'TWSE:2317',
    富士康: 'TWSE:2317',
    聯發科: 'TWSE:2454',
    台光電: 'TWSE:2383',
    華碩: 'TWSE:2357',
    統一: 'TWSE:1216',
    國泰金: 'TWSE:2882',
    台灣大: 'TWSE:3045',
    小米: 'HKEX:1810',
    小米集團: 'HKEX:1810',
    騰訊: 'HKEX:700',
    騰訊控股: 'HKEX:700',
    阿里巴巴: 'HKEX:9988',
    美團: 'HKEX:3690',
    比亞迪: 'HKEX:1211',
    網易: 'HKEX:9999',
    百度: 'HKEX:9888',
    快手: 'HKEX:1024',
    中芯國際: 'HKEX:981',
    貴州茅台: 'SSE:600519',
    茅台: 'SSE:600519',
    寧德時代: 'SZSE:300750',
    蘋果: 'NASDAQ:AAPL',
    APPLE: 'NASDAQ:AAPL',
    微軟: 'NASDAQ:MSFT',
    MICROSOFT: 'NASDAQ:MSFT',
    輝達: 'NASDAQ:NVDA',
    NVIDIA: 'NASDAQ:NVDA',
    特斯拉: 'NASDAQ:TSLA',
    TESLA: 'NASDAQ:TSLA',
    亞馬遜: 'NASDAQ:AMZN',
    AMAZON: 'NASDAQ:AMZN',
    谷歌: 'NASDAQ:GOOGL',
    GOOGLE: 'NASDAQ:GOOGL',
    臉書: 'NASDAQ:META',
    META: 'NASDAQ:META',
    波克夏: 'NYSE:BRK.B',
    BERKSHIREHATHAWAY: 'NYSE:BRK.B',
    摩根大通: 'NYSE:JPM',
    JPMORGAN: 'NYSE:JPM',
    VISA: 'NYSE:V',
    VISA卡: 'NYSE:V',
    SPACEX: 'NASDAQ:SPCX',
    SPCX: 'NASDAQ:SPCX',
    太空探索: 'NASDAQ:SPCX'
  }

  if (stockAliases[trimmed]) {
    return stockAliases[trimmed]
  }

  // 轉換常見的美股特殊代號分隔符 (如 BRK-B, BRK/B -> BRK.B)
  trimmed = trimmed.replace(/[-/]/g, '.')

  // 1. 港股前綴與後綴正規化 (HKG:1810, HK:1810, 1810.HK, 01810.HK -> HKEX:1810)
  if (/^(HKG|HK|HKE):/i.test(trimmed)) {
    const code = trimmed.replace(/^(HKG|HK|HKE):/i, '').replace(/^0+/, '') || '700'
    return `HKEX:${code}`
  }
  if (trimmed.startsWith('HKEX:')) {
    const code = trimmed.replace(/^HKEX:/i, '').replace(/^0+/, '') || '700'
    return `HKEX:${code}`
  }
  const hkPostfixMatch = trimmed.match(/^0*(\d{1,5})\.HK$/i)
  if (hkPostfixMatch) {
    return `HKEX:${hkPostfixMatch[1]}`
  }

  // 2. 陸股前綴與後綴正規化 (上證 SSE:600519 / 深證 SZSE:000001)
  if (/^(SHA|SH):/i.test(trimmed)) {
    return `SSE:${trimmed.replace(/^(SHA|SH):/i, '')}`
  }
  if (/^(SHE|SZ):/i.test(trimmed)) {
    return `SZSE:${trimmed.replace(/^(SHE|SZ):/i, '')}`
  }
  const ssMatch = trimmed.match(/^(\d{6})\.(SS|SH)$/i)
  if (ssMatch) {
    return `SSE:${ssMatch[1]}`
  }
  const szMatch = trimmed.match(/^(\d{6})\.SZ$/i)
  if (szMatch) {
    return `SZSE:${szMatch[1]}`
  }

  // 3. 日韓前綴與後綴正規化 (東證 TSE:7203 / 韓股 KRX:005930)
  if (/^TYO:/i.test(trimmed)) {
    return `TSE:${trimmed.replace(/^TYO:/i, '')}`
  }
  const tyoMatch = trimmed.match(/^(\d{4})\.T$/i)
  if (tyoMatch) {
    return `TSE:${tyoMatch[1]}`
  }
  const krxMatch = trimmed.match(/^(\d{6})\.KS$/i)
  if (krxMatch) {
    return `KRX:${krxMatch[1]}`
  }

  // 4. 台股正規化 (2330, 2330.TW, 6488.TWO, TWSE:2330, TPEX:6488)
  const embeddedTaiwanSymbol = trimmed.match(
    /(?:^|[^\d])(\d{4})(?:\.(TW|TWO))?(?:$|[^\d])/
  )
  if (embeddedTaiwanSymbol && !/^[A-Z]{2,}:/.test(trimmed)) {
    return `${embeddedTaiwanSymbol[2] === 'TWO' ? 'TPEX' : 'TWSE'}:${embeddedTaiwanSymbol[1]}`
  }

  const match = trimmed.match(/^(\d{4,})(\.TW|\.TWO)?$/)
  if (match) {
    return `${match[2] === '.TWO' ? 'TPEX' : 'TWSE'}:${match[1]}`
  }

  if (trimmed.startsWith('TPE:')) {
    return trimmed.replace('TPE:', 'TPEX:')
  }

  if (trimmed.startsWith('TWSE:') || trimmed.startsWith('TPEX:')) {
    return trimmed
  }

  // 5. 如果已經包含正確交易所前綴（如 NASDAQ:、NYSE:、AMEX:、SSE:、SZSE:、TSE: 等），直接返回
  if (trimmed.includes(':')) {
    return trimmed
  }

  // 6. 常見美股主要交易所對應
  const nasdaqStocks = [
    'TSLA',
    'AAPL',
    'MSFT',
    'GOOGL',
    'GOOG',
    'AMZN',
    'META',
    'NFLX',
    'NVDA',
    'AMD',
    'INTC',
    'PYPL',
    'ADBE',
    'CRM',
    'ORCL',
    'QCOM',
    'CSCO',
    'AVGO',
    'COST'
  ]
  const nyseStocks = [
    'BRK.A',
    'BRK.B',
    'JPM',
    'JNJ',
    'V',
    'WMT',
    'PG',
    'MA',
    'UNH',
    'HD',
    'DIS',
    'BAC',
    'XOM',
    'CVX',
    'KO',
    'MS',
    'GS',
    'C',
    'IBM',
    'BA',
    'NKE',
    'PFE'
  ]

  if (nasdaqStocks.includes(trimmed)) {
    return `NASDAQ:${trimmed}`
  }

  if (nyseStocks.includes(trimmed)) {
    return `NYSE:${trimmed}`
  }

  // 如果是一般美股代碼 (1-5 字母加可選的點)
  if (/^[A-Z]{1,5}(\.[A-Z]+)?$/.test(trimmed)) {
    return trimmed
  }

  return trimmed
}
