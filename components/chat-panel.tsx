'use client'

import * as React from 'react'
import { useEffect, useCallback } from 'react'
import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { FooterText } from '@/components/footer'
import { useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'
import { type MarketQuote } from '@/components/tradingview/market-quotes'

export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
  wide?: boolean
}

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom,
  wide = false
}: ChatPanelProps) {
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const { serializedConfig } = useUserApiKey()

  const handleMarketQuoteSelect = useCallback(
    async (quote: MarketQuote) => {
      const prompt =
        lang === 'en'
          ? `What are the latest financial results and key metrics for ${quote.name} (${quote.symbol})?`
          : `${quote.name}（${quote.symbol}）最新財務數據如何？`

      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          display: <UserMessage>{prompt}</UserMessage>
        }
      ])

      const responseMessage = await submitUserMessage(prompt, serializedConfig)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    },
    [serializedConfig, lang, setMessages, submitUserMessage]
  )

  useEffect(() => {
    const handleMarketQuoteEvent = (event: Event) => {
      const quote = (event as CustomEvent<MarketQuote>).detail
      if (quote) void handleMarketQuoteSelect(quote)
    }

    window.addEventListener('stockbot-market-quote', handleMarketQuoteEvent)
    return () =>
      window.removeEventListener(
        'stockbot-market-quote',
        handleMarketQuoteEvent
      )
  }, [handleMarketQuoteSelect])

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 w-full overflow-x-hidden pointer-events-none duration-300 ease-in-out peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
      <div className="pointer-events-auto">
        <ButtonScrollToBottom
          isAtBottom={isAtBottom}
          scrollToBottom={scrollToBottom}
        />

        <div
          className={`mx-auto px-2 sm:px-4 ${wide ? 'sm:max-w-6xl' : 'sm:max-w-4xl'}`}
        >
          <div className="space-y-2.5 rounded-t-2xl border-t border-x border-border/80 bg-background/95 p-2.5 sm:p-4 backdrop-blur-xl shadow-lg pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <PromptForm input={input} setInput={setInput} />
            <FooterText />
          </div>
        </div>
      </div>
    </div>
  )
}
