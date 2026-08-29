const SUGGESTION_MARKER =
  /---\s*SUGGESTIONS\s*---|===\s*SUGGESTIONS\s*===|【自主續問建議】|【續問建議】/i

const INVITATION_PATTERNS = [
  /有興趣.*嗎/i,
  /要不要/i,
  /是否(?:想|要|希望).*(?:嗎|呢|？|\?)/i,
  /would you like/i,
  /are you interested/i,
  /if you(?:'d| would) like/i,
  /want to (?:learn|explore|know)/i,
  /shall we/i,
  /let me know if/i
]

const LEADING_MARKUP =
  /^\s*(?:(?:[-*+•·▪◦]|\d+[.)、]|[一二三四五六七八九十]+[、.)]))\s*/
const LEADING_EMOJI =
  /^(?:[🧠📑🏦⛓️📈📰🏢🔎📊💰📉🚀📌📎💡🌐💵🪙✅⚠️🔥🌟🔬🧪🧮🗞️])+\s*/

export interface ParsedFollowupContent {
  mainText: string
  suggestions: string[]
}

function normalizeForComparison(value: string): string {
  return value
    .toLowerCase()
    .replace(/[「」『』“”"'`]/g, '')
    .replace(/[？?！!。，,：:；;、\s]/g, '')
}

export function normalizeFollowupText(value: unknown): string {
  let text = String(value ?? '')
    .replace(/\r/g, '')
    .trim()
  // Model output often stacks a number, a bullet, and an emoji. Remove all
  // leading decoration without touching ticker symbols or financial terms.
  for (let pass = 0; pass < 4; pass += 1) {
    const next = text
      .replace(LEADING_MARKUP, '')
      .replace(LEADING_EMOJI, '')
      .trim()
    if (next === text) break
    text = next
  }
  return text
    .replace(/^\*{1,3}([\s\S]+?)\*{1,3}$/, '$1')
    .replace(/^_{1,3}([\s\S]+?)_{1,3}$/, '$1')
    .trim()
}

export function isActionableFollowup(
  prompt: string,
  recentQuestions: string[] = []
): boolean {
  const text = normalizeFollowupText(prompt)
  if (text.length < 8 || text.length > 180) return false
  if (
    text.startsWith('#') ||
    /^(?:suggestions?|續問(?:建議)?|建議)/i.test(text) ||
    INVITATION_PATTERNS.some(p => p.test(text))
  ) {
    return false
  }
  const normalized = normalizeForComparison(text)
  return !recentQuestions.some(question => {
    const previous = normalizeForComparison(question)
    return Boolean(
      previous &&
        (normalized === previous ||
          (normalized.length > 18 &&
            previous.length > 18 &&
            (normalized.includes(previous) || previous.includes(normalized))))
    )
  })
}

export function normalizeFollowupSuggestions(
  suggestions: string[],
  recentQuestions: string[] = [],
  limit = 4
): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const raw of suggestions) {
    const text = normalizeFollowupText(raw)
    const key = normalizeForComparison(text)
    if (!key || seen.has(key) || !isActionableFollowup(text, recentQuestions)) {
      continue
    }
    seen.add(key)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

export function parseCaptionWithFollowups(
  content: string,
  recentQuestions: string[] = []
): ParsedFollowupContent {
  const raw = String(content || '')
  const marker = raw.match(SUGGESTION_MARKER)
  const parts = marker
    ? [
        raw.slice(0, marker.index),
        raw.slice((marker.index || 0) + marker[0].length)
      ]
    : [raw]
  return {
    mainText: parts[0]?.trim() || '',
    suggestions: normalizeFollowupSuggestions(
      (parts.slice(1).join('\n') || '').split('\n'),
      recentQuestions
    )
  }
}

// Kept as a compatibility alias for server-side caption persistence.
export const parseFollowupContent = parseCaptionWithFollowups

export function serializeFollowupContent(
  answer: string,
  suggestions: string[]
): string {
  const mainText = parseCaptionWithFollowups(answer).mainText || answer.trim()
  const cleanSuggestions = normalizeFollowupSuggestions(suggestions)
  if (!cleanSuggestions.length) return mainText
  return `${mainText}\n\n---SUGGESTIONS---\n${cleanSuggestions
    .map(prompt => `- ${prompt}`)
    .join('\n')}`
}
