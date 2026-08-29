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
  let trimmed = symbol.trim().toUpperCase()

  // 常見公司名稱先轉成 TradingView 可辨識的交易所代號。
  // 未命中的公司名稱仍應先透過 searchFinancialWeb 查證，不讓模型猜代號。
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
    VISA卡: 'NYSE:V'
  }

  if (stockAliases[trimmed]) {
    return stockAliases[trimmed]
  }

  // 轉換常見的美股特殊代號分隔符 (如 BRK-B, BRK/B -> BRK.B)
  trimmed = trimmed.replace(/[-/]/g, '.')

  // 允許「台積電 2330」或「2330.TW」這類自然輸入。
  const embeddedTaiwanSymbol = trimmed.match(
    /(?:^|[^\d])(\d{4})(?:\.(TW|TWO))?(?:$|[^\d])/
  )
  if (embeddedTaiwanSymbol && !/^[A-Z]{2,}:/.test(trimmed)) {
    return `${embeddedTaiwanSymbol[2] === 'TWO' ? 'TPEX' : 'TWSE'}:${embeddedTaiwanSymbol[1]}`
  }

  // 如果是純數字或以台股後綴結尾，就加上正確交易所前綴。
  const match = trimmed.match(/^(\d{4,})(\.TW|\.TWO)?$/)
  if (match) {
    return `${match[2] === '.TWO' ? 'TPEX' : 'TWSE'}:${match[1]}`
  }

  // 舊格式 TPE: 代表上市櫃市場，改成 TradingView 使用的 TPEX:。
  if (trimmed.startsWith('TPE:')) {
    return trimmed.replace('TPE:', 'TPEX:')
  }

  // 如果已經是 TWSE: 就直接用
  if (trimmed.startsWith('TWSE:')) {
    return trimmed
  }

  // 如果已經包含交易所前綴（如 NASDAQ:、NYSE: 等），直接返回
  if (trimmed.includes(':')) {
    return trimmed
  }

  // 常見美股主要交易所對應
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
