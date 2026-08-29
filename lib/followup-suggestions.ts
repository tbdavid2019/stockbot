const INVITATION_PATTERNS = [
  /有興趣.*嗎/i,
  /想(?:要)?(?:再|更|進一步)?.*嗎/i,
  /要不要/i,
  /是否(?:想|要|希望)/i,
  /would you like/i,
  /are you interested/i,
  /want to (?:learn|explore|know)/i
]

export function isActionableFollowup(prompt: string): boolean {
  const text = prompt.trim()
  if (text.length < 6) return false
  return !INVITATION_PATTERNS.some(pattern => pattern.test(text))
}
