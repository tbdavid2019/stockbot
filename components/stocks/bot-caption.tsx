'use client'

import React from 'react'
import { FollowupPrompts } from './followup-prompts'

interface BotCaptionProps {
  content: string
}

export function BotCaption({ content }: BotCaptionProps) {
  if (!content) return null

  // Check if caption contains suggested follow-ups delimiter
  const parts = content.split(/---SUGGESTIONS---|===SUGGESTIONS===|【自主續問建議】|【續問建議】/i)

  const mainText = parts[0]?.trim()
  const suggestionsText = parts[1]?.trim()

  let suggestions: string[] = []
  if (suggestionsText) {
    suggestions = suggestionsText
      .split('\n')
      .map(line => line.replace(/^[0-9]+[\.\)]\s*|^[•\-\*]\s*/, '').trim())
      .filter(line => line.length > 2 && !line.startsWith('#'))
  }

  return (
    <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-foreground">
      {mainText && <div className="whitespace-pre-wrap">{mainText}</div>}
      {suggestions.length > 0 && <FollowupPrompts prompts={suggestions} />}
    </div>
  )
}
