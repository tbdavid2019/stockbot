'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconCopy, IconCheck } from '@/components/ui/icons'
import { toast } from 'sonner'

interface FinancialReportCardProps {
  filename: string
  title?: string
  pages?: number
  contentSnippet?: string
  fullContent?: string
  url?: string
}

export function FinancialReportCard({
  filename,
  title,
  pages,
  contentSnippet,
  fullContent,
  url
}: FinancialReportCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const textToCopy = fullContent || contentSnippet || ''
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success('已複製財報/文件萃取內容')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const displayTitle = title || filename || '財報/年報解析文件'
  const isPdf = filename.toLowerCase().endsWith('.pdf') || url?.toLowerCase().includes('.pdf')

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/60 via-background to-blue-50/40 dark:from-indigo-950/20 dark:via-background dark:to-blue-950/10 p-4 shadow-sm space-y-3 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm text-lg">
            {isPdf ? '📑' : '📊'}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
              {displayTitle}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span>2MD AnyDoc 財報解析引擎</span>
              {pages !== undefined && pages > 0 && (
                <>
                  <span>•</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">共 {pages} 頁</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 text-xs gap-1 shrink-0 bg-background"
        >
          {copied ? <IconCheck className="size-3 text-emerald-600" /> : <IconCopy className="size-3" />}
          <span>{copied ? '已複製' : '複製內容'}</span>
        </Button>
      </div>

      {url && (
        <div className="text-[11px] font-mono text-muted-foreground truncate bg-background/60 rounded px-2 py-1 border">
          來源網址：{url}
        </div>
      )}

      {/* Snippet / Content Preview */}
      {contentSnippet && (
        <div className="rounded-xl border bg-background/80 p-3 text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed max-h-48 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-xs">
            {isExpanded ? fullContent || contentSnippet : contentSnippet}
          </pre>
        </div>
      )}

      {fullContent && fullContent.length > (contentSnippet?.length || 0) && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            {isExpanded ? '收合完整文件 ▲' : '展開完整文件全文 ▼'}
          </button>
        </div>
      )}
    </div>
  )
}
