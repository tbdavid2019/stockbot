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

  // 轉換常見的美股特殊代號分隔符 (如 BRK-B, BRK/B -> BRK.B)
  trimmed = trimmed.replace(/[-/]/g, '.')

  // 如果是純數字或以 .TW 結尾，就強制用 TWSE 前綴
  const match = trimmed.match(/^(\d{4,})(\.TW)?$/)
  if (match) {
    return `TWSE:${match[1]}`
  }

  // 如果是 TPE: 開頭也轉為 TWSE:
  if (trimmed.startsWith('TPE:')) {
    return trimmed.replace('TPE:', 'TWSE:')
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
    'TSLA', 'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NFLX',
    'NVDA', 'AMD', 'INTC', 'PYPL', 'ADBE', 'CRM', 'ORCL', 'QCOM', 'CSCO', 'AVGO', 'COST'
  ]
  const nyseStocks = [
    'BRK.A', 'BRK.B', 'JPM', 'JNJ', 'V', 'WMT', 'PG', 'MA', 'UNH',
    'HD', 'DIS', 'BAC', 'XOM', 'CVX', 'KO', 'MS', 'GS', 'C', 'IBM', 'BA', 'NKE', 'PFE'
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