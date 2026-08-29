import { searchWeb2MD, type TwoMDResultItem } from '@/lib/2md'
import { resolveMarketCatalogName } from '@/lib/market-catalog'
import { extractExplicitTicker } from '@/lib/chat/routing'

type ResearchMode = 'financial' | 'general'

interface ResearchSearchOptions {
  question: string
  symbol?: string
  mode?: ResearchMode
  limit?: number
}

function cleanQuestion(question: string): string {
  return question
    .replace(/[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, ' ')
    .replace(/\b(?:TWSE|TPEX|NASDAQ|NYSE|AMEX|BATS|ARCA|HKEX):/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractQuestionName(
  question: string,
  code: string
): string | undefined {
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = question.match(
    new RegExp(
      `([\\p{L}][\\p{L}\\d .&*\\-]{1,48})\\s*[（(]\\s*${escapedCode}\\s*[）)]`,
      'u'
    )
  )
  const value = match?.[1]
    ?.replace(
      /^(?:請|幫我|請幫我|請整理|整理|請分析|分析|查詢|解讀|查看|顯示)\s*/,
      ''
    )
    .trim()
  return value || undefined
}

function buildIntentExpansion(question: string): string {
  if (
    /供應鏈|上下游|概念股|supply chain|suppliers?|customers?/i.test(question)
  ) {
    return '供應鏈 上游零組件 下游客戶 同業 概念股'
  }
  if (
    /本業|做什麼|商業模式|產品|business model|company profile/i.test(question)
  ) {
    return '公司本業 產品 客戶 商業模式 營收來源 investor relations'
  }
  if (/新聞|消息|事件|news|catalyst/i.test(question)) {
    return '最新新聞 重大事件 法說會 公司公告'
  }
  return question
}

function resultScore(
  result: TwoMDResultItem,
  anchors: string[],
  mode: ResearchMode
): number {
  const text =
    `${result.title} ${result.description} ${result.url}`.toLowerCase()
  let score = 0
  for (const anchor of anchors) {
    if (anchor && text.includes(anchor.toLowerCase())) score += 8
  }
  if (
    /mops\.twse\.com\.tw|twse\.com\.tw|sec\.gov|investor|annual|quarter|財報|財務|營收|eps|ebitda|cash flow/i.test(
      text
    )
  ) {
    score += mode === 'financial' ? 6 : 2
  }
  if (/youtube\.com|music\.youtube|spotify\.com/i.test(text)) score -= 30
  return score
}

export async function searchResearchEvidence({
  question,
  symbol,
  mode = 'general',
  limit = 6
}: ResearchSearchOptions): Promise<{
  results: TwoMDResultItem[]
  entityName?: string
}> {
  const explicitSymbol = symbol || extractExplicitTicker(question) || ''
  const code =
    explicitSymbol
      .split(':')
      .pop()
      ?.replace(/\.(?:TW|TWO|HK)$/i, '')
      .toUpperCase() || ''
  const cleanedQuestion = cleanQuestion(question)
  const catalogName = explicitSymbol
    ? await resolveMarketCatalogName(explicitSymbol)
    : undefined
  const questionName = code
    ? extractQuestionName(cleanedQuestion, code)
    : undefined
  const entityName = catalogName || questionName
  const subject = [entityName, code].filter(Boolean).join(' ').trim()
  const intent = buildIntentExpansion(cleanedQuestion)

  const queries =
    mode === 'financial'
      ? [
          `${subject} ${cleanedQuestion} financial statement`,
          `${subject} 最新財報 營收 EPS 毛利率 營業利益率 自由現金流 本益比`,
          `${subject} 季報 財務報告 現金流 負債 估值 investor relations`,
          `${subject} latest quarterly annual financial results revenue margins EPS EBITDA cash flow valuation`
        ]
      : [
          `${subject} ${intent}`,
          `${subject} ${intent} investor relations 公司公告`,
          cleanedQuestion
        ]

  const searches = await Promise.allSettled(
    Array.from(
      new Set(queries.map(query => query.trim()).filter(Boolean))
    ).map(query => searchWeb2MD(query, 5))
  )

  const deduplicated = new Map<string, TwoMDResultItem>()
  for (const search of searches) {
    if (search.status !== 'fulfilled') continue
    for (const result of search.value) {
      if (!result.url || deduplicated.has(result.url)) continue
      if (/youtube\.com|music\.youtube|spotify\.com/i.test(result.url)) continue
      deduplicated.set(result.url, result)
    }
  }

  const anchors = [code, entityName || ''].filter(Boolean)
  const ranked = Array.from(deduplicated.values())
    .map(result => ({
      result,
      score: resultScore(result, anchors, mode)
    }))
    .filter(item => {
      if (item.score < 0) return false
      if (anchors.length === 0) return true
      return item.score >= 8
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.result)

  return { results: ranked, entityName }
}
