import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  evaluateSystemOne,
  type ChoiceAnswer,
  type ScoreAnswer,
  type NoulAnswer
} from '@/lib/clef'

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

export interface MasterConsensusMetrics {
  stance: 'strong_bull' | 'cautious_bull' | 'neutral' | 'cautious_bear' | 'strong_bear'
  stanceLabel: string
  conflictScore: number // 0 to 100
  conflictLabel: string
  tailRiskWarning: boolean | null
  confidence: number | null
}

async function evaluateMasterConsensusWithClef(
  symbol: string,
  analystSignals: Array<{ analyst: string; signal?: string; confidence?: number; reasoning: string }>
): Promise<MasterConsensusMetrics | null> {
  try {
    const res = await evaluateSystemOne(
      {
        model: 'clef-flash',
        state: {
          symbol,
          analysts: analystSignals.map(s => ({
            analyst: s.analyst,
            signal: s.signal || 'neutral',
            confidence: s.confidence || 0,
            reasoning: s.reasoning?.slice(0, 150)
          }))
        },
        questions: {
          consensus_stance: {
            type: 'choice',
            instructions: '13位大師的整體共識偏向何種立場？',
            criteria: {
              strong_bull: '強烈看多，多數大師高信心看漲',
              cautious_bull: '溫和偏多，多數看漲但有基本面或估值提醒',
              neutral: '中性觀望，多空力量均衡',
              cautious_bear: '溫和偏空，建議防守或減碼',
              strong_bear: '強烈看空，面臨嚴重下行風險'
            }
          },
          conflict_level: {
            type: 'score',
            instructions: '大師之間的觀點對立與分歧程度（由完全一致到劇烈對立）：',
            criteria: [
              '高度一致 (Unanimous)',
              '大體共識 (Broad Consensus)',
              '看法溫和分歧 (Moderate Divergence)',
              '多空顯著對立 (High Conflict)'
            ]
          },
          tail_risk_warning: {
            type: 'noul',
            instructions: '是否有頂尖大師提出致命黑天鵝、做空指控或重大估值泡沫破裂警告？'
          }
        }
      },
      { timeoutMs: 600, totalTimeoutMs: 1200 }
    )

    if (!res?.answers) return null

    const stanceAns = res.answers.consensus_stance as ChoiceAnswer | undefined
    const conflictAns = res.answers.conflict_level as ScoreAnswer | undefined
    const tailRiskAns = res.answers.tail_risk_warning as NoulAnswer | undefined

    if (!stanceAns || stanceAns.type !== 'choice') return null

    const rawConflict = typeof conflictAns?.score === 'number' ? conflictAns.score : 2
    const conflictScore = Math.round(((rawConflict - 1) / 3) * 100)

    const stanceLabels: Record<string, string> = {
      strong_bull: '🟢 強力看多共識 (Strong Bullish)',
      cautious_bull: '🌱 謹慎偏多 (Cautious Bullish)',
      neutral: '⚪ 中性觀望 (Neutral)',
      cautious_bear: '🍂 偏空防守 (Cautious Bearish)',
      strong_bear: '🔴 強烈看空警訊 (Strong Bearish)'
    }

    const conflictLabels = [
      '高度一致 (Unanimous)',
      '大體共識 (Broad Consensus)',
      '看法溫和分歧 (Moderate Divergence)',
      '多空顯著對立 (High Conflict)'
    ]

    const tailRiskWarning =
      typeof tailRiskAns?.noul === 'number' && Number.isFinite(tailRiskAns.noul)
        ? tailRiskAns.noul > 0.6
        : null

    const confidence =
      typeof stanceAns.confidence === 'number' && Number.isFinite(stanceAns.confidence)
        ? stanceAns.confidence
        : null

    return {
      stance: stanceAns.choice as any,
      stanceLabel: stanceLabels[stanceAns.choice] || stanceAns.choice,
      conflictScore,
      conflictLabel: conflictLabels[Math.min(conflictLabels.length - 1, Math.max(0, rawConflict - 1))],
      tailRiskWarning,
      confidence
    }
  } catch (err) {
    console.warn('[analysis-summary] Clef consensus evaluation skipped:', err)
    return null
  }
}

function buildLocalConsensus(
  symbol: string,
  analysis: any,
  consensusMetrics?: MasterConsensusMetrics | null
): string {
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

  const tailRiskText =
    consensusMetrics?.tailRiskWarning === true
      ? '⚠️ 存在大師提示極端下行風險'
      : consensusMetrics?.tailRiskWarning === false
        ? '未觸發重大尾部風險'
        : '待確認'

  const confidenceText =
    typeof consensusMetrics?.confidence === 'number'
      ? `（置信度 ${(consensusMetrics.confidence * 100).toFixed(0)}%）`
      : ''

  const consensusBlock = consensusMetrics
    ? `- **量化共識立場**：${consensusMetrics.stanceLabel}${confidenceText}\n- **多空分歧度**：${consensusMetrics.conflictLabel}（分歧指數 ${consensusMetrics.conflictScore}/100）\n- **尾部風險預警**：${tailRiskText}\n\n`
    : ''

  return `### 投資委員會摘要

${consensusBlock}${symbol} 的大師信號統計為：看漲 ${counts.bullish || 0}、看跌 ${counts.bearish || 0}、中性 ${counts.neutral || 0}。核心觀點精要：

${strongest
  .map(
    item =>
      `- **${item.analyst}｜${item.signal || 'neutral'} ${item.confidence || 0}%**：${item.reasoning}`
  )
  .join('\n')}`
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rateLimit = checkRateLimit(`analysis_summary:${ip}`, { maxRequests: 25, intervalMs: 60000 })
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: '摘要請求過於頻繁，請稍後再試。' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const symbol = String(body?.symbol || '')
      .trim()
      .toUpperCase()
    const analysis = body?.analysis
    const locale = String(body?.locale || 'zh-TW')

    if (!symbol || symbol.length > 50 || !analysis || typeof analysis !== 'object') {
      return NextResponse.json(
        { error: '無效或缺少 symbol / analysis 參數' },
        { status: 400 }
      )
    }

    const compact = compactAnalysis(symbol, analysis)

    // Run Clef System One rapid consensus evaluation (190ms)
    const consensusMetrics = await evaluateMasterConsensusWithClef(symbol, compact.analystSignals)

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
${consensusMetrics ? `\n【System 1 客觀量化共識指標】：\n- 委員會立場：${consensusMetrics.stanceLabel}${typeof consensusMetrics.confidence === 'number' ? ` (信心度: ${(consensusMetrics.confidence * 100).toFixed(0)}%)` : ''}\n- 多空分歧指數：${consensusMetrics.conflictLabel} (${consensusMetrics.conflictScore}/100)\n- 尾部風險標記：${consensusMetrics.tailRiskWarning === true ? '⚠️ 存在重大尾部下行警訊' : consensusMetrics.tailRiskWarning === false ? '無顯著尾部警報' : '未評估/待確認'}\n請將上述客觀量化指標融入您的結論與共識分析中。\n` : ''}
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
          return NextResponse.json({
            summary: result.text.trim(),
            consensusMetrics
          })
        }
      } catch (error: any) {
        console.warn(
          `[analysis-summary] ${provider.name} failed:`,
          error?.message || error
        )
      }
    }

    return NextResponse.json({
      summary: buildLocalConsensus(symbol, analysis, consensusMetrics),
      consensusMetrics
    })
  } catch (error: any) {
    console.error('[analysis-summary] failed:', error)
    return NextResponse.json(
      { error: error?.message || '無法產生綜合摘要' },
      { status: 500 }
    )
  }
}
