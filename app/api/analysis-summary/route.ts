import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

interface SummaryProvider {
  name: string
  baseURL: string
  apiKey: string
  model: string
}

function getSummaryProviders(): SummaryProvider[] {
  const providers: SummaryProvider[] = []
  const add = (
    name: string,
    baseURL: string | undefined,
    apiKey: string | undefined,
    model: string | undefined
  ) => {
    if (!apiKey || !model) return
    providers.push({
      name,
      baseURL: baseURL || 'https://api.openai.com/v1',
      apiKey,
      model
    })
  }

  add(
    'Primary',
    process.env.PRIMARY_BASE_URL || process.env.OPENAI_BASE_URL,
    process.env.PRIMARY_API_KEY || process.env.OPENAI_API_KEY,
    process.env.PRIMARY_MODEL || process.env.MODEL || 'gpt-4o-mini'
  )

  for (let i = 1; i <= 3; i++) {
    add(
      `Fallback #${i}`,
      process.env[`FALLBACK_${i}_BASE_URL`],
      process.env[`FALLBACK_${i}_API_KEY`],
      process.env[`FALLBACK_${i}_MODEL`]
    )
  }

  add(
    'Groq',
    process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    process.env.GROQ_API_KEY,
    process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
  )

  add(
    'Gemini',
    process.env.GEMINI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta/openai/',
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  )

  const seen = new Set<string>()
  return providers.filter(provider => {
    const key = `${provider.baseURL}:${provider.model}:${provider.apiKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function stringifyReasoning(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 1800)
  try {
    return JSON.stringify(value).slice(0, 1800)
  } catch {
    return String(value).slice(0, 1800)
  }
}

function compactAnalysis(symbol: string, analysis: any) {
  const analystSignals = Object.entries(analysis?.analyst_signals || {})
    .filter(([analyst]) => analyst !== 'round_table')
    .slice(0, 16)
    .map(([analyst, signals]) => {
      const values =
        signals && typeof signals === 'object'
          ? Object.values(signals as Record<string, unknown>)
          : []
      const signal = values[0] as any
      return {
        analyst,
        signal: signal?.signal,
        confidence: signal?.confidence,
        reasoning: stringifyReasoning(signal?.reasoning)
      }
    })

  const decisions = analysis?.decisions
    ? Object.values(analysis.decisions)[0]
    : undefined
  const roundTable = analysis?.round_table
    ? Object.values(analysis.round_table)[0]
    : undefined

  return {
    symbol,
    decision: decisions,
    roundTable,
    analystSignals
  }
}

function buildLocalConsensus(symbol: string, analysis: any): string {
  const signals = compactAnalysis(symbol, analysis).analystSignals
  const counts = signals.reduce(
    (acc, item) => {
      const signal = item.signal || 'neutral'
      acc[signal] = (acc[signal] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const strongest = [...signals]
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    .slice(0, 3)

  return `### 投資委員會摘要

${symbol} 的大師信號統計為：看漲 ${counts.bullish || 0}、看跌 ${counts.bearish || 0}、中性 ${counts.neutral || 0}。目前無法取得文字模型綜合判讀，先依實際分析資料整理信心度最高的觀點：

${strongest
  .map(
    item =>
      `- **${item.analyst}｜${item.signal || 'neutral'} ${item.confidence || 0}%**：${item.reasoning}`
  )
  .join('\n')}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const symbol = String(body?.symbol || '')
      .trim()
      .toUpperCase()
    const analysis = body?.analysis
    const locale = String(body?.locale || 'zh-TW')

    if (!symbol || !analysis) {
      return NextResponse.json(
        { error: '缺少 symbol 或 analysis' },
        { status: 400 }
      )
    }

    const compact = compactAnalysis(symbol, analysis)
    const system = `You are the chief investment officer synthesizing a multi-analyst stock report.

Use ONLY the supplied analysis payload. Do not invent financial data. Do not merely tell the user to read the analyst cards.

Write a decision-useful executive synthesis with these sections:
1. 一句話結論 / One-line conclusion
2. 多數共識 / Majority consensus
3. 關鍵分歧 / Important disagreements
4. 關鍵數字與證據 / Key numbers and evidence
5. 主要風險與資料限制 / Risks and data limitations
6. 投資人下一步應核對什麼 / What to verify next

Explicitly compare bullish, bearish, and neutral views. Mention the strongest evidence and any contradictory or low-quality inputs. Never output generic filler such as "以上是最新分析".

Language: ${locale.toLowerCase().startsWith('en') ? 'English' : 'Traditional Chinese (繁體中文)'}.
The result is research commentary, not personalized investment advice.`

    const providers = getSummaryProviders().slice(0, 2)
    for (const provider of providers) {
      try {
        const client = createOpenAI({
          baseURL: provider.baseURL,
          apiKey: provider.apiKey
        })
        const result = await generateText({
          model: client(provider.model),
          system,
          prompt: JSON.stringify(compact),
          maxTokens: 1400,
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(10000)
        })
        if (result.text.trim()) {
          return NextResponse.json({ summary: result.text.trim() })
        }
      } catch (error: any) {
        console.warn(
          `[analysis-summary] ${provider.name} failed:`,
          error?.message || error
        )
      }
    }

    return NextResponse.json({ summary: buildLocalConsensus(symbol, analysis) })
  } catch (error: any) {
    console.error('[analysis-summary] failed:', error)
    return NextResponse.json(
      { error: error?.message || '無法產生綜合摘要' },
      { status: 500 }
    )
  }
}
