'use client'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { useEffect, useState, useRef } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import { Message, Session } from '@/lib/types'
import { usePathname, useRouter } from 'next/navigation'
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { toast } from 'sonner'
import { TickerTape } from '@/components/tradingview/ticker-tape'
import { MissingApiKeyBanner } from '@/components/missing-api-key-banner'
import {
  getChatSession,
  saveChatSession,
  deriveChatTitle,
  createUIStateFromStoredMessages,
  CHAT_SELECT_EVENT,
  CHAT_NEW_EVENT
} from '@/lib/chat-history'
import { nanoid } from 'nanoid'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  session?: Session
  missingKeys: string[]
}

export function Chat({ id, className, session, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useUIState()
  const [aiState, setAIState] = useAIState()
  const [wideMode, setWideMode] = useState(true)
  const currentChatIdRef = useRef<string>(id || nanoid())
  const hasHydratedRef = useRef(false)

  useEffect(() => {
    const syncLayoutMode = () => {
      setWideMode(localStorage.getItem('stockbot_layout_mode') !== '"narrow"')
    }

    syncLayoutMode()
    window.addEventListener('stockbot-layout-change', syncLayoutMode)
    window.addEventListener('local-storage-change', syncLayoutMode)

    return () => {
      window.removeEventListener('stockbot-layout-change', syncLayoutMode)
      window.removeEventListener('local-storage-change', syncLayoutMode)
    }
  }, [])

  // 1. Client-side hydration from localStorage on mount
  useEffect(() => {
    const targetId = id || currentChatIdRef.current
    if (targetId) {
      currentChatIdRef.current = targetId
      const stored = getChatSession(targetId)
      if (stored && stored.messages && stored.messages.length > 0) {
        setAIState({
          chatId: stored.id,
          messages: stored.messages
        })
        setMessages(createUIStateFromStoredMessages(stored.messages))
      }
    }
    hasHydratedRef.current = true
  }, [id, setAIState, setMessages])

  // 2. Persist chat session to localStorage whenever AI messages update
  useEffect(() => {
    if (!hasHydratedRef.current) return
    const currentMessages = aiState?.messages || []
    if (currentMessages.length > 0) {
      const activeId = aiState.chatId || currentChatIdRef.current
      const existing = getChatSession(activeId)
      const title = existing?.title || deriveChatTitle(currentMessages)

      saveChatSession({
        id: activeId,
        title,
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
        messages: currentMessages
      })

      // Update URL without full refresh
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes(`/chat/${activeId}`)
      ) {
        window.history.replaceState({}, '', `/chat/${activeId}`)
      }
    }
  }, [aiState?.messages, aiState?.chatId])

  // 3. Listen to external select chat and new chat events
  useEffect(() => {
    const handleSelectChat = (e: any) => {
      const selectedId = e.detail?.id
      if (!selectedId) return
      currentChatIdRef.current = selectedId
      const target = getChatSession(selectedId)
      if (target) {
        setAIState({
          chatId: target.id,
          messages: target.messages || []
        })
        setMessages(createUIStateFromStoredMessages(target.messages || []))
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', `/chat/${target.id}`)
        }
      }
    }

    const handleNewChat = () => {
      const newId = nanoid()
      currentChatIdRef.current = newId
      setAIState({
        chatId: newId,
        messages: []
      })
      setMessages([])
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `/`)
      }
    }

    window.addEventListener(CHAT_SELECT_EVENT, handleSelectChat)
    window.addEventListener(CHAT_NEW_EVENT, handleNewChat)

    return () => {
      window.removeEventListener(CHAT_SELECT_EVENT, handleSelectChat)
      window.removeEventListener(CHAT_NEW_EVENT, handleNewChat)
    }
  }, [setAIState, setMessages])

  // 4. Missing API keys toast
  useEffect(() => {
    missingKeys.map(key => {
      toast.error(`Missing ${key} environment variable!`)
    })
  }, [missingKeys])

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor()

  return (
    <div
      className="group min-w-0 w-full overflow-auto overflow-x-hidden pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[300px]"
      ref={scrollRef}
    >
      <TickerTape />
      {messages.length > 0 && <MissingApiKeyBanner missingKeys={missingKeys} />}

      <div
        className={cn(
          messages.length ? 'pb-[200px] pt-4 md:pt-6' : 'pb-[200px] pt-0',
          className
        )}
        ref={messagesRef}
      >
        {messages.length ? (
          <ChatList
            messages={messages}
            isShared={false}
            session={session}
            wide={wideMode}
          />
        ) : (
          <EmptyScreen wide={wideMode} />
        )}
        <div className="w-full h-px" ref={visibilityRef} />
      </div>
      <ChatPanel
        id={aiState?.chatId || currentChatIdRef.current}
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
        wide={wideMode}
      />
    </div>
  )
}
