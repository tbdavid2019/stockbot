export type GlobalExchange =
  | 'TWSE'
  | 'TPEX'
  | 'NASDAQ'
  | 'NYSE'
  | 'AMEX'
  | 'ARCA'
  | 'BATS'
  | 'IEX'
  | 'HKEX'
  | 'JPX'
  | 'SSE'
  | 'SZSE'
  | 'LSE'
  | 'EURONEXT'

export type GlobalSecurity = {
  exchange: GlobalExchange
  code: string
  canonicalTicker: `${GlobalExchange}:${string}`
  yahooTicker: string
  name: string
  englishName?: string
  legalName?: string
  aliases: string[]
  isin?: string
  instrumentType?: string
  sourceDate?: string
}

export type GlobalResolution = {
  status: 'resolved' | 'ambiguous' | 'unresolved'
  security?: GlobalSecurity
  candidates: GlobalSecurity[]
}

type Cell = string | number | null | undefined

type MatrixPayload = { aaData?: unknown }

function cell(row: Cell[], index: number): string | undefined {
  const value = row[index]
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function cleanCode(value?: string): string | undefined {
  const code = value?.trim().toUpperCase()
  return code && /^[A-Z0-9.$^+=/_-]{1,24}$/.test(code) ? code : undefined
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.map(value => value?.trim()).filter(Boolean) as string[])
  )
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s\u3000·．.、，,／/\\()（）「」『』【】\-—_]/g, '')
}

function security(
  exchange: GlobalExchange,
  code: string,
  name: string,
  options: Omit<
    Partial<GlobalSecurity>,
    'exchange' | 'code' | 'canonicalTicker' | 'yahooTicker' | 'name'
  > = {}
): GlobalSecurity {
  const { aliases: extraAliases, ...rest } = options
  const paddedCode = exchange === 'HKEX' ? code.padStart(5, '0') : code
  const yahooTicker =
    exchange === 'HKEX'
      ? `${String(Number(paddedCode)).padStart(4, '0')}.HK`
      : exchange === 'JPX'
        ? `${paddedCode}.T`
        : exchange === 'SSE'
          ? `${paddedCode}.SS`
          : exchange === 'SZSE'
            ? `${paddedCode}.SZ`
            : exchange === 'TWSE'
              ? `${paddedCode}.TW`
              : exchange === 'TPEX'
                ? `${paddedCode}.TWO`
                : exchange === 'LSE'
                  ? `${paddedCode}.L`
                  : exchange === 'EURONEXT'
                    ? `${paddedCode}.PA`
                    : paddedCode

  return {
    exchange,
    code: paddedCode,
    canonicalTicker: `${exchange}:${paddedCode}`,
    yahooTicker,
    name,
    aliases: unique([
      name,
      rest.legalName,
      rest.englishName,
      paddedCode,
      code,
      ...(extraAliases || [])
    ]),
    ...rest
  }
}

function parsePipeLine(line: string): string[] {
  return line.split('|').map(value => value.trim())
}

export function normalizeNasdaqText(raw: string): GlobalSecurity[] {
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const headerIndex = lines.findIndex(line => line.startsWith('Symbol|'))
  if (headerIndex < 0) return []
  const header = parsePipeLine(lines[headerIndex])
  const index = (name: string) => header.indexOf(name)
  const result: GlobalSecurity[] = []
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.startsWith('File Creation Time:')) continue
    const row = parsePipeLine(line)
    const code = cleanCode(row[index('Symbol')])
    const name = row[index('Security Name')]?.trim()
    if (!code || !name || row[index('Test Issue')] === 'Y') continue
    result.push(
      security('NASDAQ', code, name, {
        instrumentType: row[index('ETF')] === 'Y' ? 'ETF' : 'Equity',
        sourceDate: row[index('File Creation Time')] || undefined
      })
    )
  }
  return result
}

const NASDAQ_OTHER_EXCHANGES: Record<string, GlobalExchange> = {
  N: 'NYSE',
  A: 'AMEX',
  P: 'ARCA',
  Z: 'BATS',
  V: 'IEX'
}

export function normalizeNasdaqOtherText(raw: string): GlobalSecurity[] {
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const headerIndex = lines.findIndex(line => line.startsWith('ACT Symbol|'))
  if (headerIndex < 0) return []
  const header = parsePipeLine(lines[headerIndex])
  const index = (name: string) => header.indexOf(name)
  const result: GlobalSecurity[] = []
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.startsWith('File Creation Time:')) continue
    const row = parsePipeLine(line)
    const exchange = NASDAQ_OTHER_EXCHANGES[row[index('Exchange')]]
    const code = cleanCode(row[index('ACT Symbol')])
    const name = row[index('Security Name')]?.trim()
    if (!exchange || !code || !name || row[index('Test Issue')] === 'Y')
      continue
    result.push(
      security(exchange, code, name, {
        instrumentType: row[index('ETF')] === 'Y' ? 'ETF' : 'Equity'
      })
    )
  }
  return result
}

export function normalizeHkexRows(rows: Cell[][]): GlobalSecurity[] {
  const headerIndex = rows.findIndex(
    row => cell(row, 0)?.toLowerCase() === 'stock code'
  )
  if (headerIndex < 0) return []
  const header = rows[headerIndex].map(item =>
    item?.toString().trim().toLowerCase()
  )
  const index = (name: string) => header.indexOf(name.toLowerCase())
  const nameIndex =
    index('name of securities') >= 0
      ? index('name of securities')
      : index('english stock short name')
  const categoryIndex = index('category')
  const isinIndex = index('isin')
  return rows.slice(headerIndex + 1).flatMap(row => {
    const code = cell(row, index('stock code'))
    const name = cell(row, nameIndex)
    if (!code || !name || !/^\d{1,5}$/.test(code)) return []
    return [
      security('HKEX', code, name, {
        isin: isinIndex >= 0 ? cell(row, isinIndex) : undefined,
        instrumentType:
          categoryIndex >= 0 ? cell(row, categoryIndex) : 'Equity',
        sourceDate: undefined
      })
    ]
  })
}

export function normalizeJpxRows(rows: Cell[][]): GlobalSecurity[] {
  const headerIndex = rows.findIndex(
    row => cell(row, 0) === '日付' && cell(row, 1) === 'コード'
  )
  if (headerIndex < 0) return []
  return rows.slice(headerIndex + 1).flatMap(row => {
    const date = cell(row, 0)
    const code = cleanCode(cell(row, 1))
    const name = cell(row, 2)
    if (!code || !name) return []
    return [
      security('JPX', code, name, {
        instrumentType: cell(row, 3),
        sourceDate: date
      })
    ]
  })
}

export function normalizeSseSuggestionText(raw: string): GlobalSecurity[] {
  const result: GlobalSecurity[] = []
  const pattern =
    /_t\.push\(\{val:\s*["']([^"']+)["'],val2:\s*["']([^"']+)["'],val3:\s*["']([^"']*)["']/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(raw))) {
    const code = cleanCode(match[1])
    const name = match[2].trim()
    if (!code || !name) continue
    result.push(security('SSE', code, name, { aliases: [match[3]] }))
  }
  return result
}

export function normalizeSzseRows(rows: Cell[][]): GlobalSecurity[] {
  const headerIndex = rows.findIndex(row =>
    row.some(item => item === 'A股代码')
  )
  if (headerIndex < 0) return []
  const header = rows[headerIndex].map(item => item?.toString().trim())
  const codeIndex = header.indexOf('A股代码')
  const nameIndex = header.indexOf('A股简称')
  const dateIndex = header.indexOf('A股上市日期')
  const boardIndex = header.indexOf('板块')
  return rows.slice(headerIndex + 1).flatMap(row => {
    const rawCode = cell(row, codeIndex)?.split('.')[0]
    const code = rawCode && /^\d{6}$/.test(rawCode) ? rawCode : undefined
    const name = cell(row, nameIndex)
    if (!code || !name) return []
    return [
      security('SZSE', code, name, {
        instrumentType: cell(row, boardIndex),
        sourceDate: cell(row, dateIndex)
      })
    ]
  })
}

function stripMarkup(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text || undefined
}

const EURONEXT_MIC_SUFFIX: Record<string, string> = {
  XAMS: '.AS',
  XBRU: '.BR',
  XLIS: '.LS',
  XMIL: '.MI',
  XOSL: '.OL',
  XATH: '.AT',
  XPAR: '.PA',
  XLDN: '.L'
}

function euronextSuffix(market: string): string {
  const normalized = market.toUpperCase()
  const mic = Object.keys(EURONEXT_MIC_SUFFIX).find(item =>
    normalized.includes(item)
  )
  if (mic) return EURONEXT_MIC_SUFFIX[mic]
  if (normalized.includes('AMSTERDAM')) return '.AS'
  if (normalized.includes('BRUSSELS')) return '.BR'
  if (normalized.includes('LISBON')) return '.LS'
  if (normalized.includes('MILAN')) return '.MI'
  if (normalized.includes('OSLO')) return '.OL'
  if (normalized.includes('ATHENS')) return '.AT'
  if (normalized.includes('LONDON')) return '.L'
  return '.PA'
}

export function normalizeEuronextRows(
  payload: MatrixPayload | unknown[][]
): GlobalSecurity[] {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.aaData)
      ? payload.aaData
      : []
  return rows
    .flatMap(rawRow => {
      if (!Array.isArray(rawRow)) return []
      const isin = stripMarkup(rawRow[1])
      const symbol = stripMarkup(rawRow[2])
      const market = stripMarkup(rawRow[3])?.toUpperCase()
      const name = stripMarkup(rawRow[0]) || symbol
      if (!symbol || !name || !market || !/^[A-Z0-9.-]{1,24}$/.test(symbol))
        return []
      return [
        security('EURONEXT', symbol, name, {
          englishName: name,
          isin,
          aliases: [market],
          instrumentType: 'Equity',
          sourceDate: undefined
        })
      ]
    })
    .map(item => {
      const suffix = euronextSuffix(item.aliases[item.aliases.length - 1])
      return { ...item, yahooTicker: `${item.code}${suffix}` }
    })
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }
  values.push(value.trim())
  return values
}

function parseSemicolonCsvLine(line: string): string[] {
  return parseDelimitedLine(line, ';')
}

export function normalizeEuronextCsv(raw: string): GlobalSecurity[] {
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const headerIndex = lines.findIndex(line =>
    line.startsWith('Name;ISIN;Symbol;Market')
  )
  if (headerIndex < 0) return []
  const result: GlobalSecurity[] = []
  for (const line of lines.slice(headerIndex + 1)) {
    const row = parseSemicolonCsvLine(line)
    const name = row[0]
    const isin = row[1]
    const symbol = cleanCode(row[2])
    const market = row[3]?.toUpperCase()
    if (!name || !symbol || !market || !/^[A-Z0-9.-]{1,24}$/.test(symbol))
      continue
    const marketCode =
      Object.entries(EURONEXT_MIC_SUFFIX).find(([mic]) =>
        market.includes(mic)
      )?.[0] || market
    result.push(
      security('EURONEXT', symbol, name, {
        englishName: name,
        isin,
        aliases: marketCode ? [marketCode] : [market],
        instrumentType: 'Equity'
      })
    )
  }
  return result.map(item => {
    const suffix = euronextSuffix(item.aliases[item.aliases.length - 1])
    return { ...item, yahooTicker: `${item.code}${suffix}` }
  })
}

export function normalizeLseCsv(raw: string): GlobalSecurity[] {
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const headerIndex = lines.findIndex(line =>
    /(?:TIDM|Mnemonic|Instrument Code).*[,;].*(?:Name|Instrument)/i.test(line)
  )
  if (headerIndex < 0) return []
  const delimiter = lines[headerIndex].includes(';') ? ';' : ','
  const header = parseDelimitedLine(lines[headerIndex], delimiter).map(item =>
    item.toLowerCase()
  )
  const index = (names: string[]) =>
    names.map(name => header.indexOf(name)).find(item => item >= 0) ?? -1
  const codeIndex = index(['tidm', 'mnemonic', 'instrument code', 'code'])
  const nameIndex = index(['instrument name', 'name', 'issuer name'])
  const isinIndex = index(['isin', 'isin code'])
  if (codeIndex < 0 || nameIndex < 0) return []
  return lines.slice(headerIndex + 1).flatMap(line => {
    const row = parseDelimitedLine(line, delimiter)
    const code = cleanCode(row[codeIndex])
    const name = row[nameIndex]
    if (!code || !name) return []
    return [
      security('LSE', code, name, {
        isin: isinIndex >= 0 ? row[isinIndex] : undefined,
        instrumentType: 'Equity'
      })
    ]
  })
}

function directCode(input: string): {
  exchange?: GlobalExchange
  code?: string
} {
  const value = input.trim().replace(/^\$/, '').toUpperCase()
  const qualified = value.match(
    /\b(TWSE|TPEX|NASDAQ|NYSE|AMEX|ARCA|BATS|IEX|HKEX|JPX|SSE|SZSE|LSE|EURONEXT)\s*:\s*([A-Z0-9.$^+=/_-]+)\b/i
  )
  if (qualified)
    return {
      exchange: qualified[1].toUpperCase() as GlobalExchange,
      code: cleanCode(qualified[2])
    }
  const yahoo = value.match(/\b([A-Z0-9.$^+=/_-]+)\.(TW|TWO|HK|T|SS|SZ|L)\b/i)
  if (yahoo) {
    const exchange: GlobalExchange = {
      TW: 'TWSE',
      TWO: 'TPEX',
      HK: 'HKEX',
      T: 'JPX',
      SS: 'SSE',
      SZ: 'SZSE',
      L: 'LSE'
    }[yahoo[2].toUpperCase()] as GlobalExchange
    return { exchange, code: cleanCode(yahoo[1]) }
  }
  const numeric = value.match(/\b\d{4,6}\b/)
  if (numeric) return { code: cleanCode(numeric[0]) }
  if (/^[A-Z0-9.$^+=/_-]{1,24}$/.test(value) && /\d/.test(value))
    return { code: cleanCode(value) }
  return {}
}

export function resolveGlobalSecurity(
  input: string,
  universe: GlobalSecurity[]
): GlobalResolution {
  const direct = directCode(input)
  if (direct.code) {
    const matches = universe.filter(item => {
      const sameCode =
        item.code === direct.code ||
        (item.exchange === 'HKEX' && Number(item.code) === Number(direct.code))
      return sameCode && (!direct.exchange || item.exchange === direct.exchange)
    })
    if (matches.length === 1)
      return { status: 'resolved', security: matches[0], candidates: matches }
    if (matches.length > 1) return { status: 'ambiguous', candidates: matches }
  }
  const query = normalizeText(input)
  if (!query) return { status: 'unresolved', candidates: [] }
  const matches = universe.filter(item =>
    item.aliases.some(alias => {
      const normalized = normalizeText(alias)
      return normalized.length >= 2 && query.includes(normalized)
    })
  )
  const candidates = Array.from(
    new Map(matches.map(item => [item.canonicalTicker, item])).values()
  )
  if (candidates.length === 1)
    return { status: 'resolved', security: candidates[0], candidates }
  if (candidates.length > 1) return { status: 'ambiguous', candidates }
  return { status: 'unresolved', candidates: [] }
}
