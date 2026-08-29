'use client'

import React from 'react'
import { useActions, useUIState } from 'ai/rsc'
import { UserMessage } from './message'
import { nanoid } from 'nanoid'
import { type AI } from '@/lib/chat/actions'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { normalizeFollowupText } from '@/lib/followup-suggestions'

interface FollowupPromptsProps {
  prompts: string[]
}

export function FollowupPrompts({ prompts }: FollowupPromptsProps) {
  const { submitUserMessage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
  const [apiKey] = useLocalStorage('groqKey', '')
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  if (!prompts || prompts.length === 0) return null

  const handlePromptClick = async (promptText: string) => {
    const cleanText = normalizeFollowupText(promptText)
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
    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
      <div className="inline-flex shrink-0 items-center gap-1.5">
        <span aria-hidden="true" className="text-[11px]">
          ↳
        </span>
        <span>{lang === 'en' ? 'Next' : '接著問'}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1">
        {prompts.map(p => {
          const displayText = normalizeFollowupText(p)
          const key = displayText.toLocaleLowerCase().replace(/\s+/g, ' ')
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePromptClick(displayText)}
              aria-label={`${lang === 'en' ? 'Ask: ' : '追問：'}${displayText}`}
              className="group inline-flex max-w-full items-center gap-1 rounded-sm p-0.5 text-left text-xs leading-5 text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:opacity-70"
            >
              <span>{displayText}</span>
              <span aria-hidden="true" className="text-[10px] opacity-60">
                →
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
