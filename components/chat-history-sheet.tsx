'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  IconMessage,
  IconPlus,
  IconTrash,
  IconEdit,
  IconCheck,
  IconClose,
  IconCopy
} from '@/components/ui/icons'
import {
  ChatSession,
  getChatSessions,
  deleteChatSession,
  clearAllChatSessions,
  updateChatTitle,
  CHAT_HISTORY_EVENT,
  CHAT_SELECT_EVENT,
  CHAT_NEW_EVENT
} from '@/lib/chat-history'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function formatSessionTime(timestamp: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return '剛剛'
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `今天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
    return `昨天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString([], {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface ChatHistorySheetProps {
  currentChatId?: string
  onSelectChat?: (id: string) => void
  onNewChat?: () => void
  trigger?: React.ReactNode
}

export function ChatHistorySheet({
  currentChatId,
  onSelectChat,
  onNewChat,
  trigger
}: ChatHistorySheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Load sessions from localStorage
  const loadSessions = () => {
    const loaded = getChatSessions()
    setSessions(loaded)
  }

  useEffect(() => {
    loadSessions()

    const handleUpdate = () => {
      loadSessions()
    }

    window.addEventListener(CHAT_HISTORY_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(CHAT_HISTORY_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  // Filter sessions by search query
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const matchTitle = session.title?.toLowerCase().includes(q)
    const matchMessages = session.messages?.some((m: any) => {
      const content =
        typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      return content.toLowerCase().includes(q)
    })
    return matchTitle || matchMessages
  })

  // Group filtered sessions by date
  const now = new Date()
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const yesterdayStart = todayStart - 86400000
  const last7DaysStart = todayStart - 7 * 86400000

  const groups = {
    today: filteredSessions.filter(
      s => (s.updatedAt || s.createdAt || 0) >= todayStart
    ),
    yesterday: filteredSessions.filter(
      s =>
        (s.updatedAt || s.createdAt || 0) >= yesterdayStart &&
        (s.updatedAt || s.createdAt || 0) < todayStart
    ),
    last7Days: filteredSessions.filter(
      s =>
        (s.updatedAt || s.createdAt || 0) >= last7DaysStart &&
        (s.updatedAt || s.createdAt || 0) < yesterdayStart
    ),
    older: filteredSessions.filter(
      s => (s.updatedAt || s.createdAt || 0) < last7DaysStart
    )
  }

  const handleSelect = (id: string) => {
    if (onSelectChat) {
      onSelectChat(id)
    } else {
      window.dispatchEvent(
        new CustomEvent(CHAT_SELECT_EVENT, { detail: { id } })
      )
    }
    setIsOpen(false)
  }

  const handleStartNew = () => {
    if (onNewChat) {
      onNewChat()
    } else {
      window.dispatchEvent(new CustomEvent(CHAT_NEW_EVENT))
    }
    setIsOpen(false)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteChatSession(id)
    toast.success('已刪除對話紀錄')
  }

  const handleStartEdit = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation()
    setEditingId(session.id)
    setEditTitle(session.title)
  }

  const handleSaveEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (editTitle.trim()) {
      updateChatTitle(id, editTitle)
      toast.success('已更新對話名稱')
    }
    setEditingId(null)
  }

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const handleCopySession = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation()
    const lines: string[] = []
    lines.push(`# ${session.title || 'StockBot 對話紀錄'}`)
    lines.push(
      `時間: ${new Date(session.updatedAt || session.createdAt).toLocaleString('zh-TW')}\n`
    )
    if (session.messages && Array.isArray(session.messages)) {
      for (const msg of session.messages) {
        if (msg.role === 'user') {
          lines.push(
            `### 👤 使用者:\n${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}\n`
          )
        } else if (
          msg.role === 'assistant' &&
          typeof msg.content === 'string' &&
          msg.content
        ) {
          lines.push(`### 🤖 888 StockBot:\n${msg.content}\n`)
        } else if (msg.role === 'tool' && Array.isArray(msg.content)) {
          for (const item of msg.content) {
            if (item?.result?.caption) {
              lines.push(`### 🤖 888 StockBot 分析:\n${item.result.caption}\n`)
            }
          }
        }
      }
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(lines.join('\n'))
      toast.success('已複製整段對話至剪貼簿！')
    }
  }

  const handleClearAll = () => {
    clearAllChatSessions()
    toast.success('已清除所有對話歷史紀錄')
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
            title="查看對話歷史紀錄 (Chat History)"
          >
            <span className="text-base">📜</span>
            <span className="hidden sm:inline">歷史紀錄</span>
            {sessions.length > 0 && (
              <span className="ml-0.5 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                {sessions.length}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-[88vw] max-w-sm flex-col p-0 sm:max-w-md"
      >
        {/* Header */}
        <SheetHeader className="border-b px-4 py-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <SheetTitle className="text-base font-bold">
                對話歷史紀錄
              </SheetTitle>
              {sessions.length > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                  {sessions.length} 筆對話
                </span>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Actions & Search */}
        <div className="space-y-2 border-b bg-muted/20 p-3">
          <Button
            onClick={handleStartNew}
            className="w-full justify-start gap-2 bg-[#F55036] text-white hover:bg-[#e0452c] shadow-sm font-semibold text-xs"
          >
            <IconPlus className="size-4" />
            <span>開啟新對話 (Start New Chat)</span>
          </Button>

          <div className="relative">
            <Input
              type="text"
              placeholder="搜尋歷史對話或關鍵字..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
            <svg
              className="absolute left-2.5 top-2 size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
              >
                <IconClose className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-medium">目前尚無歷史紀錄</p>
              <p className="text-[11px] text-muted-foreground/80 max-w-[200px]">
                開始向 888 StockBot 詢問股票、行情或 AI
                分析，系統將自動保存於本機。
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              找不到與「{searchQuery}」相關的對話紀錄
            </div>
          ) : (
            <>
              {renderGroup('今天 (Today)', groups.today)}
              {renderGroup('昨天 (Yesterday)', groups.yesterday)}
              {renderGroup('過去 7 天 (Last 7 Days)', groups.last7Days)}
              {renderGroup('更早以前 (Older)', groups.older)}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/10 p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>🔒 本機瀏覽器儲存</span>
            </div>

            {sessions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                  >
                    <IconTrash className="size-3" />
                    <span>清除全部</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent aria-describedby="clear-chat-description">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      確定要清除所有對話紀錄嗎？
                    </AlertDialogTitle>
                    <AlertDialogDescription id="clear-chat-description">
                      此操作將永久刪除儲存在本機瀏覽器中的所有對話紀錄，無法復原。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      確認清除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )

  function renderGroup(title: string, groupSessions: ChatSession[]) {
    if (!groupSessions || groupSessions.length === 0) return null

    return (
      <div className="space-y-1">
        <div className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
        <div className="space-y-1">
          {groupSessions.map(session => {
            const isActive = session.id === currentChatId
            const isEditing = editingId === session.id

            return (
              <div
                key={session.id}
                onClick={() => !isEditing && handleSelect(session.id)}
                className={cn(
                  'group relative flex flex-col rounded-lg border p-2.5 transition-all cursor-pointer text-left',
                  isActive
                    ? 'border-orange-500 bg-orange-50/50 dark:border-orange-600 dark:bg-orange-950/20 shadow-xs'
                    : 'border-transparent bg-background hover:border-border hover:bg-muted/50'
                )}
              >
                {isEditing ? (
                  <div
                    className="flex items-center gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <Input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter')
                          handleSaveEdit(e as any, session.id)
                        if (e.key === 'Escape') handleCancelEdit(e as any)
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-green-600 hover:text-green-700"
                      onClick={e => handleSaveEdit(e, session.id)}
                    >
                      <IconCheck className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-muted-foreground"
                      onClick={handleCancelEdit}
                    >
                      <IconClose className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <IconMessage className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                        <span className="font-semibold text-xs truncate text-foreground">
                          {session.title || '無標題對話'}
                        </span>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="複製整段對話"
                          onClick={e => handleCopySession(e, session)}
                        >
                          <IconCopy className="size-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="修改名稱"
                          onClick={e => handleStartEdit(e, session)}
                        >
                          <IconEdit className="size-3" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          title="刪除對話"
                          onClick={e => handleDelete(e, session.id)}
                        >
                          <IconTrash className="size-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {formatSessionTime(
                          session.updatedAt || session.createdAt
                        )}
                      </span>
                      {session.messages && session.messages.length > 0 && (
                        <span>
                          {
                            session.messages.filter(
                              (m: any) => m.role === 'user'
                            ).length
                          }{' '}
                          輪對話
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
