'use client'

import React from 'react'
import { useActions, useUIState } from 'ai/rsc'
import { UserMessage } from './message'
import { nanoid } from 'nanoid'
import { type AI } from '@/lib/chat/actions'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'

interface FollowupPromptsProps {
  prompts: string[]
}

export function FollowupPrompts({ prompts }: FollowupPromptsProps) {
  const { submitUserMessage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
  const [apiKey] = useLocalStorage('groqKey', '')

  if (!prompts || prompts.length === 0) return null

  const handlePromptClick = async (promptText: string) => {
    // Clean prompt text (remove leading bullet or emoji if desired, or keep as is)
    const cleanText = promptText.replace(/^[•\-\*]\s*/, '').trim()
    if (!cleanText) return

    // Optimistically add user message
    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        display: <UserMessage>{cleanText}</UserMessage>
      }
    ])

    try {
      const responseMessage = await submitUserMessage(cleanText, apiKey)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    } catch (err) {
      console.error('Failed to submit followup message:', err)
    }
  }

  return (
    <div className="mt-3.5 pt-3 border-t border-border/40 flex flex-col space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
        <span className="text-sm">💡</span>
        <span>您可以接著問（點擊快速追問）：</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p, idx) => {
          const displayText = p.replace(/^[•\-\*]\s*/, '').trim()
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptClick(displayText)}
              className="group text-left text-xs px-3 py-1.5 rounded-full border border-indigo-200/70 dark:border-indigo-800/60 bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 hover:border-indigo-400 text-slate-800 dark:text-slate-200 transition-all duration-150 shadow-xs hover:shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>{displayText}</span>
              <span className="text-indigo-500 dark:text-indigo-400 text-[10px] group-hover:translate-x-0.5 transition-transform">
                ↳
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
