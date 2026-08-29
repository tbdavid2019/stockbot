import type { Message } from '@/lib/types'
import {
  normalizeFollowupSuggestions,
  normalizeFollowupText,
  parseCaptionWithFollowups,
  serializeFollowupContent
} from '@/lib/followup-suggestions'

export const SUGGESTIONS_MARKER = '---SUGGESTIONS---'

export type FollowupContext = {
  symbol: string
  company?: string
  toolName: string
  question: string
  language: 'zh-TW' | 'en'
  transcript: string
  recentQuestions: string[]
  previousSuggestions: string[]
  resultContext: string
}

const MAX_TEXT = 900
const MAX_TRANSCRIPT = 4200

function compact(value: unknown, limit = MAX_TEXT): string {
  if (value == null) return ''
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.replace(/\s+/g, ' ').trim().slice(0, limit)
}

function messageParts(message: Message): string[] {
  if (typeof message.content === 'string') return [compact(message.content)]
  if (!Array.isArray(message.content)) return []

  return message.content.flatMap((part: any) => {
    if (!part) return []
    if (part.type === 'tool-call') {
      return [`tool-call ${part.toolName}: ${compact(part.args, 500)}`]
    }
    if (part.type === 'tool-result') {
      const result = part.result || {}
      return [`tool-result ${part.toolName}: ${compact(result, 1100)}`]
    }
    return []
  })
}

export function buildFollowupContext(
  messages: Message[],
  input: {
    symbol: string
    toolName: string
    question: string
    resultContext?: string
    company?: string
  }
): FollowupContext {
  const transcriptLines = messages.slice(-14).flatMap(message => {
    const parts = messageParts(message)
    return parts.length ? [`${message.role}: ${parts.join(' | ')}`] : []
  })
  const transcript = transcriptLines.join('\n').slice(-MAX_TRANSCRIPT)
  const recentQuestions = messages
    .filter(
      message => message.role === 'user' && typeof message.content === 'string'
    )
    .map(message => compact(message.content))
    .filter(Boolean)
    .slice(-8)
  const previousSuggestions = messages
    .slice(-20)
    .flatMap(message => {
      if (typeof message.content === 'string') {
        return parseCaptionWithFollowups(message.content).suggestions
      }
      if (!Array.isArray(message.content)) return []
      return message.content.flatMap((part: any) =>
        part?.type === 'tool-result' && typeof part.result?.caption === 'string'
          ? parseCaptionWithFollowups(part.result.caption).suggestions
          : []
      )
    })
    .slice(-12)

  return {
    symbol: compact(input.symbol, 180),
    company: input.company ? compact(input.company, 180) : undefined,
    toolName: input.toolName,
    question: compact(input.question, 700),
    language: /[\u3400-\u9fff]/.test(input.question) ? 'zh-TW' : 'en',
    transcript,
    recentQuestions,
    previousSuggestions,
    resultContext: compact(input.resultContext, 1800)
  }
}

export function parseFollowupResponse(raw: string): string[] {
  const text = raw
    .replace(/```(?:json|text)?/gi, '')
    .replace(/```/g, '')
    .trim()
  let values: unknown[] = []
  try {
    const parsed = JSON.parse(text)
    values = Array.isArray(parsed) ? parsed : parsed?.suggestions || []
  } catch {
    values = text.split(/\r?\n|\s*[•·]\s*/).map(normalizeFollowupText)
  }
  return values.map(normalizeFollowupText).filter(Boolean)
}

export function normalizeFollowups(
  values: string[],
  context: FollowupContext
): string[] {
  return normalizeFollowupSuggestions(
    values,
    [
      context.question,
      ...context.recentQuestions,
      ...context.previousSuggestions
    ],
    4
  )
}

function financialFocus(question: string): string {
  return (
    question.match(
      /EBITDA|EBIT|EPS|ROE|ROIC|FCF|自由現金流|營收成長率|營收|營業利益率|毛利率|淨利率|本益比|P\/E|P\/B|P\/S|殖利率|負債比|流動比|YoY|QoQ|年增率|季增率/i
    )?.[0] || '目前討論的財務指標'
  )
}

export function contextDerivedFallback(context: FollowupContext): string[] {
  const hasSpecificSubject = Boolean(
    context.symbol && context.symbol !== '目前主題'
  )
  const subject =
    context.company && context.company !== context.symbol
      ? `${context.company}（${context.symbol}）`
      : hasSpecificSubject
        ? context.symbol
        : context.language === 'zh-TW'
          ? '目前討論的標的'
          : 'the current subject'
  const q = context.question || ''
  const focus = financialFocus(q)
  const isMetric =
    /metric|financial|財務|ebitda|ebit|eps|營收|毛利|現金流|估值|yoy|qoq/i.test(
      `${context.toolName} ${q}`
    )
  const candidates =
    context.language === 'zh-TW'
      ? isMetric
        ? [
            `核對 ${subject} 的 ${focus} 所屬期間、幣別與 reported／adjusted 口徑`,
            `比較 ${subject} 的 ${focus} 與前期變化，並拆解主要驅動因素`,
            `用 ${subject} 最新營收、獲利率與自由現金流交叉驗證 ${focus}`,
            `列出目前回答 ${subject} 的 ${focus} 尚缺哪些可核實資料`
          ]
        : [
            `把 ${subject} 的上方資料拆成已確認事實、推論與尚待核實項目`,
            `追查 ${subject} 最近一季最影響目前結論的營運變化`,
            `比較 ${subject} 與主要同業在目前問題上的差異`,
            `列出 ${subject} 目前資料仍無法回答的關鍵缺口`
          ]
      : isMetric
        ? [
            `Verify ${subject}'s ${focus} by period, currency, and reported or adjusted basis`,
            `Compare ${subject}'s ${focus} with prior periods and explain the main drivers`,
            `Cross-check ${subject}'s ${focus} against revenue, margins, and free cash flow`,
            `Identify the missing evidence needed to verify ${subject}'s ${focus}`
          ]
        : [
            `Break ${subject}'s latest evidence into operating drivers and risks`,
            `Review ${subject}'s latest quarter and management guidance`,
            `Compare ${subject} with key peers on recent performance and valuation`,
            `List what remains unverified in the current ${subject} data`
          ]
  return normalizeFollowups(candidates, context)
}

export function serializeFollowups(
  answer: string,
  suggestions: string[]
): string {
  return serializeFollowupContent(answer, suggestions)
}
