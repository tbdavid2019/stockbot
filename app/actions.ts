'use server'

import { redirect } from 'next/navigation'

export async function refreshHistory(path: string) {
  redirect(path)
}

export async function getMissingKeys(): Promise<string[]> {
  const hasAnyKey = Boolean(
    process.env.PRIMARY_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.NEN_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.FALLBACK_1_API_KEY ||
    process.env.FALLBACK_2_API_KEY ||
    process.env.FALLBACK_3_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  )

  if (hasAnyKey) {
    return []
  }

  return ['PRIMARY_API_KEY']
}
