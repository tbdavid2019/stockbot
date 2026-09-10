export type TaiwanExchange = 'TWSE' | 'TPEX'

export type MarketSecurity = {
  exchange: TaiwanExchange
  code: string
  canonicalTicker: `${TaiwanExchange}:${string}`
  yahooTicker: string
  name: string
  legalName?: string
  englishName?: string
  aliases: string[]
  sourceDate?: string
}

export type MarketResolution = {
  status: 'resolved' | 'ambiguous' | 'unresolved'
  security?: MarketSecurity
  candidates: MarketSecurity[]
}

type RawRow = Record<string, unknown>

function text(row: RawRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value))
      return String(value)
  }
  return undefined
}

function cleanCode(value?: string): string | undefined {
  const code = value?.trim().toUpperCase()
  return code && /^[A-Z0-9.-]{2,10}$/.test(code) ? code : undefined
}

function cleanMatchText(value: string): string {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s\u3000·．.、，,／/\\()（）「」『』【】\-—_]/g, '')
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.map(value => value?.trim()).filter(Boolean) as string[])
  )
}

function normalizeRow(
  row: RawRow,
  exchange: TaiwanExchange,
  fields: {
    code: string[]
    name: string[]
    legalName: string[]
    englishName: string[]
    date: string[]
  }
): MarketSecurity | undefined {
  const code = cleanCode(text(row, ...fields.code))
  const name = text(row, ...fields.name)
  if (!code || !name) return undefined

  const legalName = text(row, ...fields.legalName)
  const englishName = text(row, ...fields.englishName)
  const aliases = unique([name, legalName, englishName, code])

  return {
    exchange,
    code,
    canonicalTicker: `${exchange}:${code}`,
    yahooTicker: `${code}.${exchange === 'TWSE' ? 'TW' : 'TWO'}`,
    name,
    legalName,
    englishName,
    aliases,
    sourceDate: text(row, ...fields.date)
  }
}

export function normalizeTwseRows(rows: unknown[]): MarketSecurity[] {
  return rows
    .filter((row): row is RawRow =>
      Boolean(row && typeof row === 'object' && !Array.isArray(row))
    )
    .map(row =>
      normalizeRow(row, 'TWSE', {
        code: ['公司代號', '股票代號', '代號'],
        name: ['公司簡稱', '公司名稱'],
        legalName: ['公司名稱'],
        englishName: ['英文簡稱', '公司英文名稱'],
        date: ['出表日期', '上市日期']
      })
    )
    .filter((item): item is MarketSecurity => Boolean(item))
}

export function normalizeTpExRows(rows: unknown[]): MarketSecurity[] {
  return rows
    .filter((row): row is RawRow =>
      Boolean(row && typeof row === 'object' && !Array.isArray(row))
    )
    .map(row =>
      normalizeRow(row, 'TPEX', {
        code: ['SecuritiesCompanyCode', 'CompanyCode', '股票代號', '代號'],
        name: ['CompanyAbbreviation', '公司簡稱', 'CompanyName', '公司名稱'],
        legalName: ['CompanyName', '公司名稱'],
        englishName: ['Symbol', 'EnglishCompanyName', '英文簡稱'],
        date: ['Date', 'DateOfListing', '上櫃日期']
      })
    )
    .filter((item): item is MarketSecurity => Boolean(item))
}

function normalizeInput(input: string): string {
  return input.trim().replace(/^\$/, '').toUpperCase()
}

function directCode(input: string): {
  exchange?: TaiwanExchange
  code?: string
} {
  const value = normalizeInput(input)
  const qualified = value.match(/\b(TWSE|TPEX)\s*:\s*([A-Z0-9.-]+)\b/i)
  if (qualified)
    return {
      exchange: qualified[1].toUpperCase() as TaiwanExchange,
      code: cleanCode(qualified[2])
    }
  if (/^[A-Z0-9.-]+\.(?:TW|TWO)$/i.test(value)) {
    const code = value.replace(/\.(?:TW|TWO)$/i, '')
    return {
      exchange: value.endsWith('.TWO') ? 'TPEX' : 'TWSE',
      code: cleanCode(code)
    }
  }
  if (/^[0-9]{4,6}$/.test(value)) return { code: value }
  return {}
}

export function resolveMarketSecurity(
  input: string,
  universe: MarketSecurity[]
): MarketResolution {
  const { exchange, code } = directCode(input)
  if (code) {
    const codeMatches = universe.filter(
      item => item.code === code && (!exchange || item.exchange === exchange)
    )
    if (codeMatches.length === 1)
      return {
        status: 'resolved',
        security: codeMatches[0],
        candidates: codeMatches
      }
    if (codeMatches.length > 1)
      return { status: 'ambiguous', candidates: codeMatches }
  }

  const query = cleanMatchText(input)
  if (!query) return { status: 'unresolved', candidates: [] }

  const matched = universe.filter(item =>
    item.aliases.some(alias => {
      const normalized = cleanMatchText(alias)
      return normalized.length >= 2 && query.includes(normalized)
    })
  )
  const candidates = Array.from(
    new Map(matched.map(item => [item.canonicalTicker, item])).values()
  )
  if (candidates.length === 1)
    return { status: 'resolved', security: candidates[0], candidates }
  if (candidates.length > 1) return { status: 'ambiguous', candidates }
  return { status: 'unresolved', candidates: [] }
}
