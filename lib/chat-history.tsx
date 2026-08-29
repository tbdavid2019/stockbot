'use client'

import React from 'react'
import { UIState } from '@/lib/chat/actions'
import { BotCard, BotMessage, UserMessage } from '@/components/stocks/message'
import { StockChart } from '@/components/tradingview/stock-chart'
import { StockPrice } from '@/components/tradingview/stock-price'
import { StockNews } from '@/components/tradingview/stock-news'
import { StockFinancials } from '@/components/tradingview/stock-financials'
import { StockScreener } from '@/components/tradingview/stock-screener'
import { MarketOverview } from '@/components/tradingview/market-overview'
import { MarketHeatmap } from '@/components/tradingview/market-heatmap'
import { MarketTrending } from '@/components/tradingview/market-trending'
import { ETFHeatmap } from '@/components/tradingview/etf-heatmap'
import { StockAnalysis } from '@/components/tradingview/stock-analysis'
import { NativeFinancialsCard } from '@/components/stocks/native-financials-card'
import { FinancialMetricCard } from '@/components/stocks/financial-metric-card'
import { NativeStockNewsCard } from '@/components/stocks/native-news-card'
import { WebSearchResults } from '@/components/stocks/web-search-results'
import { WikiPublishResultCard } from '@/components/stocks/wiki-publish-result'
import { FinancialReportCard } from '@/components/stocks/financial-report-card'
import { BotCaption } from '@/components/stocks/bot-caption'

export const CHAT_STORAGE_KEY = 'stockbot_chat_sessions_v1'
export const CHAT_HISTORY_EVENT = 'stockbot-chat-history-updated'
export const CHAT_SELECT_EVENT = 'stockbot-select-chat'
export const CHAT_NEW_EVENT = 'stockbot-new-chat'

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: any[]
}

/**
 * Retrieve all saved chat sessions from localStorage (sorted newest first)
 */
export function getChatSessions(): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!data) return []
    const parsed: ChatSession[] = JSON.parse(data)
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  } catch (error) {
    console.error('Failed to get chat sessions from localStorage:', error)
    return []
  }
}

/**
 * Retrieve a single chat session by ID
 */
export function getChatSession(id: string): ChatSession | null {
  if (typeof window === 'undefined' || !id) return null
  const sessions = getChatSessions()
  return sessions.find(s => s.id === id) || null
}

/**
 * Save or update a chat session in localStorage
 */
export function saveChatSession(
  session: Omit<ChatSession, 'updatedAt'> & { updatedAt?: number }
): void {
  if (typeof window === 'undefined' || !session.id) return
  try {
    const sessions = getChatSessions()
    const now = Date.now()
    const existingIndex = sessions.findIndex(s => s.id === session.id)

    const updatedSession: ChatSession = {
      id: session.id,
      title: session.title || '新對話',
      createdAt: session.createdAt || now,
      updatedAt: session.updatedAt || now,
      messages: session.messages || []
    }

    if (existingIndex >= 0) {
      updatedSession.createdAt =
        sessions[existingIndex].createdAt || updatedSession.createdAt
      sessions[existingIndex] = updatedSession
    } else {
      sessions.unshift(updatedSession)
    }

    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions))
    window.dispatchEvent(
      new CustomEvent(CHAT_HISTORY_EVENT, { detail: { sessions } })
    )
  } catch (error) {
    console.error('Failed to save chat session:', error)
  }
}

/**
 * Delete a specific chat session by ID
 */
export function deleteChatSession(id: string): void {
  if (typeof window === 'undefined' || !id) return
  try {
    const sessions = getChatSessions().filter(s => s.id !== id)
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions))
    window.dispatchEvent(
      new CustomEvent(CHAT_HISTORY_EVENT, {
        detail: { sessions, deletedId: id }
      })
    )
  } catch (error) {
    console.error('Failed to delete chat session:', error)
  }
}

/**
 * Clear all chat sessions from localStorage
 */
export function clearAllChatSessions(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY)
    window.dispatchEvent(
      new CustomEvent(CHAT_HISTORY_EVENT, { detail: { sessions: [] } })
    )
  } catch (error) {
    console.error('Failed to clear chat sessions:', error)
  }
}

/**
 * Update the title of a specific chat session
 */
export function updateChatTitle(id: string, newTitle: string): void {
  if (typeof window === 'undefined' || !id || !newTitle.trim()) return
  try {
    const sessions = getChatSessions()
    const target = sessions.find(s => s.id === id)
    if (target) {
      target.title = newTitle.trim()
      target.updatedAt = Date.now()
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions))
      window.dispatchEvent(
        new CustomEvent(CHAT_HISTORY_EVENT, { detail: { sessions } })
      )
    }
  } catch (error) {
    console.error('Failed to update chat title:', error)
  }
}

/**
 * Helper to derive a clean human-readable title from the first user message
 */
export function deriveChatTitle(messages: any[]): string {
  if (!messages || messages.length === 0) return '新對話'
  const firstUserMsg = messages.find(m => m.role === 'user')
  if (!firstUserMsg) return '新對話'

  const content =
    typeof firstUserMsg.content === 'string'
      ? firstUserMsg.content
      : JSON.stringify(firstUserMsg.content)

  const clean = content.trim().replace(/^["']|["']$/g, '')
  if (!clean) return '新對話'
  return clean.length > 36 ? `${clean.slice(0, 36)}...` : clean
}

/**
 * Reconstruct React UIState from serialized stored messages
 */
export function createUIStateFromStoredMessages(messages: any[]): UIState {
  if (!messages || !Array.isArray(messages)) return []
  const uiState: UIState = []

  // Create a quick lookup for tool results by toolCallId
  const toolResultsMap: { [toolCallId: string]: any } = {}
  for (const msg of messages) {
    if (msg.role === 'tool' && Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (item.type === 'tool-result' && item.toolCallId) {
          toolResultsMap[item.toolCallId] = item.result
        }
      }
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (!msg) continue

    // 1. User Message
    if (msg.role === 'user') {
      const userText =
        typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content)
      uiState.push({
        id: msg.id || `user-${i}`,
        display: <UserMessage>{userText}</UserMessage>
      })
    }

    // 2. Assistant Message
    else if (msg.role === 'assistant') {
      // 2A. Plain text assistant message
      if (typeof msg.content === 'string') {
        uiState.push({
          id: msg.id || `assistant-${i}`,
          display: <BotMessage content={msg.content} />
        })
      }
      // 2B. Tool call assistant message
      else if (Array.isArray(msg.content)) {
        for (let tIdx = 0; tIdx < msg.content.length; tIdx++) {
          const item = msg.content[tIdx]
          if (item.type === 'tool-call') {
            const toolName = item.toolName
            const args = item.args || {}
            const toolCallId = item.toolCallId
            const result = toolCallId ? toolResultsMap[toolCallId] : null
            const caption = result?.caption || ''

            let cardContent: React.ReactNode = null

            switch (toolName) {
              case 'showStockChart':
                cardContent = (
                  <StockChart
                    symbol={args.symbol || result?.symbol || 'AAPL'}
                    comparisonSymbols={
                      args.comparisonSymbols || result?.comparisonSymbols || []
                    }
                  />
                )
                break

              case 'showStockPrice':
                cardContent = (
                  <StockPrice props={args.symbol || result?.symbol || 'AAPL'} />
                )
                break

              case 'showStockFinancials':
                cardContent = (
                  <NativeFinancialsCard
                    symbol={args.symbol || result?.symbol || 'AAPL'}
                  />
                )
                break

              case 'answerFinancialMetric':
                cardContent = (
                  <FinancialMetricCard
                    symbol={args.symbol || result?.symbol || 'AAPL'}
                    question={args.question || result?.question || ''}
                    sources={result?.sources || []}
                  />
                )
                break

              case 'showStockNews':
                cardContent = (
                  <NativeStockNewsCard
                    symbol={args.symbol || result?.symbol || 'AAPL'}
                  />
                )
                break

              case 'showStockScreener':
                cardContent = <StockScreener />
                break

              case 'showMarketOverview':
                cardContent = <MarketOverview />
                break

              case 'showMarketHeatmap':
                cardContent = <MarketHeatmap />
                break

              case 'showETFHeatmap':
                cardContent = <ETFHeatmap />
                break

              case 'showTrendingStocks':
                cardContent = <MarketTrending />
                break

              case 'analyzeStockWithAI':
                cardContent = (
                  <StockAnalysis
                    symbol={args.symbol || result?.symbol || 'AAPL'}
                  />
                )
                break

              case 'searchFinancialWeb':
                cardContent = (
                  <WebSearchResults
                    query={args.query || result?.query || ''}
                    results={result?.results || []}
                  />
                )
                break

              case 'readWebPage':
                cardContent = (
                  <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-2 text-xs">
                    <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <span>🌐 2MD Web Reader 網頁全文讀取完成</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-mono truncate">
                      {args.url || result?.url}
                    </p>
                  </div>
                )
                break

              case 'readFinancialReport':
                cardContent = (
                  <FinancialReportCard
                    filename={
                      args.url?.split('/').pop() ||
                      result?.filename ||
                      '財報/年報解析.pdf'
                    }
                    url={args.url || result?.url}
                    contentSnippet={
                      result?.content
                        ? result.content.slice(0, 600) + '...'
                        : ''
                    }
                    fullContent={result?.content}
                  />
                )
                break

              case 'publishToDavid888Wiki':
                cardContent = result?.success ? (
                  <WikiPublishResultCard
                    title={args.title || result?.title || 'Wiki Report'}
                    shareUrl={result?.shareUrl}
                    presentUrl={result?.presentUrl}
                    bookUrl={result?.bookUrl}
                    theme={args.theme || result?.theme}
                    path={result?.path}
                  />
                ) : (
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs">
                    ⚠️ Wiki 發布失敗：{result?.error || '未知錯誤'}
                  </div>
                )
                break

              default:
                cardContent = null
            }

            uiState.push({
              id: `${msg.id || i}-tool-${tIdx}`,
              display: (
                <BotCard>
                  {cardContent}
                  {caption && <BotCaption content={caption} />}
                </BotCard>
              )
            })
          }
        }
      }
    }
  }

  return uiState
}
