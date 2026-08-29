'use client'

import * as React from 'react'
import Textarea from 'react-textarea-autosize'

import { useActions, useUIState } from 'ai/rsc'

import { UserMessage } from './stocks/message'
import { type AI } from '@/lib/chat/actions'
import { Button } from '@/components/ui/button'
import { IconArrowDown, IconPlus, IconClose } from '@/components/ui/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { nanoid } from 'nanoid'
import { useRouter } from 'next/navigation'

import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { CHAT_NEW_EVENT } from '@/lib/chat-history'
import { toast } from 'sonner'

interface AttachedDocument {
  filename: string
  title?: string
  pages?: number
  content: string
  size?: number
}

export function PromptForm({
  input,
  setInput
}: {
  input: string
  setInput: (value: string) => void
}) {
  const router = useRouter()
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { submitUserMessage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
  const [apiKey, setApiKey] = useLocalStorage('groqKey', '')
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  const [attachedDoc, setAttachedDoc] = React.useState<AttachedDocument | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    if (!file) return

    if (file.size > 25 * 1024 * 1024) {
      toast.error('檔案大小不能超過 25MB')
      return
    }

    setIsUploading(true)
    const toastId = toast.loading(`正在透過 2MD AnyDoc 解析 ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || '檔案解析失敗')
      }

      setAttachedDoc({
        filename: data.filename || file.name,
        title: data.title,
        pages: data.pages,
        content: data.content,
        size: data.size || file.size
      })

      toast.success(
        `✅ ${file.name} 解析完成！${data.pages ? `(共 ${data.pages} 頁)` : ''}`,
        { id: toastId }
      )
    } catch (err: any) {
      console.error('Upload document error:', err)
      toast.error(`❌ 解析失敗: ${err.message || '請確認檔案格式'}`, { id: toastId })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmitForm = async () => {
    const value = input.trim()
    if (!value && !attachedDoc) return

    const currentDoc = attachedDoc
    setInput('')
    setAttachedDoc(null)

    // Construct user display
    let userDisplayNode: React.ReactNode
    let fullPromptPayload: string

    if (currentDoc) {
      userDisplayNode = (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300 text-xs font-semibold">
            <span>📑 附件財報/文件：{currentDoc.filename}</span>
            {currentDoc.pages ? (
              <span className="text-[10px] opacity-75">({currentDoc.pages} 頁)</span>
            ) : null}
          </div>
          <p className="text-sm">
            {value ||
              '請詳細解讀並深度分析這份財報/文件，包含關鍵財務數據、毛利率、自由現金流、營收成長、主要風險與大師投資評價。'}
          </p>
        </div>
      )

      fullPromptPayload = `【使用者已上傳財報/文件 (${currentDoc.filename})，由 2MD AnyDoc 引擎萃取之全文】：\n${currentDoc.content}\n\n【使用者分析指令/提問】：\n${value || '請詳細解讀並深度分析這份財報/文件，包含關鍵財務數據、毛利率、自由現金流、營收成長趨勢、主要風險與大師投資評價。'}`
    } else {
      userDisplayNode = value
      fullPromptPayload = value
    }

    // Optimistically add user message UI
    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        display: <UserMessage>{userDisplayNode}</UserMessage>
      }
    ])

    // Submit to AI
    const responseMessage = await submitUserMessage(fullPromptPayload, apiKey)
    setMessages(currentMessages => [...currentMessages, responseMessage])
  }

  return (
    <form
      ref={formRef}
      onSubmit={async (e: any) => {
        e.preventDefault()

        if (window.innerWidth < 600) {
          e.target['message']?.blur()
        }

        await handleSubmitForm()
      }}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file)
        }}
      />

      <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-background px-8 sm:border sm:px-14">
        {/* Left Action Buttons */}
        <div className="absolute left-0 top-[14px] flex items-center gap-1 sm:left-3">
          {/* New Chat Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 rounded-full bg-background p-0"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent(CHAT_NEW_EVENT))
                  router.push('/')
                }}
              >
                <IconPlus className="size-4" />
                <span className="sr-only">New Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {lang === 'en' ? 'Start New Chat' : '開啟新對話 (New Chat)'}
            </TooltipContent>
          </Tooltip>

          {/* Upload Document / PDF / Financial Report Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isUploading}
                className="size-8 rounded-full bg-background p-0 hover:text-indigo-600 hover:border-indigo-300"
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="size-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                ) : (
                  <svg
                    className="size-4 text-slate-700 dark:text-slate-200"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                )}
                <span className="sr-only">
                  {lang === 'en'
                    ? 'Upload financial report, annual report, or PDF'
                    : '上傳財報、年報、PDF或文件'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {lang === 'en'
                ? 'Upload financial report, annual report, PDF or spreadsheet'
                : '上傳財報、年報、PDF 或 Excel 文件解讀'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Attached Document Preview Chip */}
        {attachedDoc && (
          <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
            <span className="text-sm">📄</span>
            <span className="font-semibold truncate max-w-[220px] sm:max-w-xs">
              {attachedDoc.filename}
            </span>
            {attachedDoc.pages && (
              <span className="rounded bg-indigo-200/60 px-1 py-0.2 text-[10px] dark:bg-indigo-900/60">
                {attachedDoc.pages} {lang === 'en' ? 'pages' : '頁'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setAttachedDoc(null)}
              className="ml-auto text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
              title={lang === 'en' ? 'Remove attachment' : '移除附件'}
            >
              <IconClose className="size-3" />
            </button>
          </div>
        )}

        {/* Input Textarea */}
        <Textarea
          ref={inputRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          placeholder={
            attachedDoc
              ? lang === 'en'
                ? 'Enter analysis prompt (e.g., analyze margins, free cash flow & master investor evaluation)...'
                : '輸入分析要求（例如：請幫我分析這份財報的毛利率與自由現金流，並以巴菲特觀點評估）'
              : lang === 'zh'
                ? '輸入訊息或點擊 📎 上傳財報/PDF 解讀...（例如：台積電股價、TSLA 值得買嗎）'
                : 'Send a message or click 📎 to upload financial report/PDF... (e.g. Apple stock price, Should I buy TSLA?)'
          }
          className="min-h-[60px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          name="message"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
        />

        {/* Submit Button */}
        <div className="absolute right-0 top-[13px] sm:right-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="submit"
                size="icon"
                disabled={(input === '' && !attachedDoc) || isUploading}
              >
                <div className="rotate-180">
                  <IconArrowDown />
                </div>
                <span className="sr-only">Send message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>傳送訊息 (Send message)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </form>
  )
}
