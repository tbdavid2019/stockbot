export type NormalizedTicker = {
  input: string
  ticker?: string
  market?: string
  ambiguous: boolean
  clarification?: string
}

export function normalizeTicker(input: string): NormalizedTicker {
  const original = input.trim()
  const value = original.toUpperCase().replace(/^\$/, '')
  if (!value) return { input: original, ambiguous: true, clarification: '請提供股票名稱或代號。' }
  if (/^\d{4,6}$/.test(value)) return { input: original, ticker: `${value}.TW`, market: 'TW', ambiguous: false }
  if (/^\d{4,6}\.TW$/.test(value)) return { input: original, ticker: value, market: 'TW', ambiguous: false }
  if (/^(TWSE|TPEX|HKEX|NASDAQ|NYSE|AMEX|ARCA|BATS):[A-Z0-9.-]+$/.test(value)) return { input: original, ticker: value.split(':')[1], market: value.split(':')[0], ambiguous: false }
  if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(value)) return { input: original, ticker: value, market: 'US', ambiguous: false }
  return { input: original, ambiguous: true, clarification: `無法唯一解析「${original}」，請提供市場與股票代號。` }
}

export function tickerPathSegment(input: string) {
  const normalized = normalizeTicker(input)
  return normalized.ticker ? encodeURIComponent(normalized.ticker) : encodeURIComponent(input.trim())
}
