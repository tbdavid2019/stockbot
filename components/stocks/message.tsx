'use client'

import * as React from 'react'
import { IconGroq, IconUser } from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { spinner } from './spinner'
import { CodeBlock } from '../ui/codeblock'
import { MemoizedReactMarkdown } from '../markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { StreamableValue } from 'ai/rsc'
import { useStreamableText } from '@/lib/hooks/use-streamable-text'
import { FollowupPrompts } from './followup-prompts'
import { parseCaptionWithFollowups } from '@/lib/followup-suggestions'
import { CopyButton } from '@/components/copy-button'

// Different types of message bubbles.

export function UserMessage({ children }: { children: React.ReactNode }) {
  const textContent = typeof children === 'string' ? children : ''

  return (
    <div className="group relative flex items-start md:-ml-12">
      <div className="flex size-[25px] shrink-0 select-none items-center justify-center rounded-md border bg-background shadow-sm">
        <IconUser />
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">{children}</div>
          {textContent && (
            <CopyButton
              value={textContent}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function BotMessage({
  content,
  className
}: {
  content: string | StreamableValue<string>
  className?: string
}) {
  const text = useStreamableText(content)

  const { mainText, suggestions } = parseCaptionWithFollowups(text)

  const displayText = mainText || text

  return (
    <div className={cn('group relative flex items-start md:-ml-12', className)}>
      <div className="flex size-[25px] shrink-0 select-none items-center justify-center rounded-md bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-sm font-black text-xs ring-1 ring-white/20 tracking-tighter">
        8
      </div>
      <div className="ml-4 flex-1 space-y-2 overflow-hidden px-1">
        <div className="relative group/botmsg">
          <MemoizedReactMarkdown
            className="prose max-w-none break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 w-full"
            remarkPlugins={[remarkGfm, remarkMath]}
            components={{
              p({ children }) {
                return <p className="mb-2 last:mb-0">{children}</p>
              },
              code({ node, inline, className, children, ...props }) {
                const childList = React.Children.toArray(children)
                if (childList.length > 0 && childList[0] === '▍') {
                  return (
                    <span className="mt-1 animate-pulse cursor-default">
                      ▍
                    </span>
                  )
                }

                const cleanChildren = childList.map(child =>
                  typeof child === 'string' ? child.replace('`▍`', '▍') : child
                )

                const match = /language-(\w+)/.exec(className || '')

                if (inline) {
                  return (
                    <code className={className} {...props}>
                      {cleanChildren}
                    </code>
                  )
                }

                return (
                  <CodeBlock
                    key={Math.random()}
                    language={(match && match[1]) || ''}
                    value={String(children).replace(/\n$/, '')}
                    {...props}
                  />
                )
              }
            }}
          >
            {displayText}
          </MemoizedReactMarkdown>
          {displayText && (
            <div className="mt-2.5 flex items-center justify-end">
              <CopyButton
                value={displayText}
                showLabel
                label="複製文字"
                copiedLabel="已複製"
              />
            </div>
          )}
        </div>
        {suggestions.length > 0 && <FollowupPrompts prompts={suggestions} />}
      </div>
    </div>
  )
}

export function BotCard({
  children,
  showAvatar = true
}: {
  children: React.ReactNode
  showAvatar?: boolean
}) {
  return (
    <div className="group relative flex items-start md:-ml-12">
      <div
        className={cn(
          'flex size-[25px] shrink-0 select-none items-center justify-center rounded-md bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-sm font-black text-xs ring-1 ring-white/20 tracking-tighter',
          !showAvatar && 'invisible'
        )}
      >
        8
      </div>
      <div className="ml-4 flex-1 pl-2">{children}</div>
    </div>
  )
}

export function SystemMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={
        'mt-2 flex items-center justify-center gap-2 text-xs text-gray-500'
      }
    >
      <div className={'max-w-[600px] flex-initial p-2'}>{children}</div>
    </div>
  )
}

export function SpinnerMessage() {
  return (
    <div className="group relative flex items-start md:-ml-12">
      <div className="flex size-[25px] shrink-0 select-none items-center justify-center rounded-md bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-sm font-black text-xs ring-1 ring-white/20 tracking-tighter">
        8
      </div>
      <div className="ml-4 h-[24px] flex flex-row items-center flex-1 space-y-2 overflow-hidden px-1">
        {spinner}
      </div>
    </div>
  )
}
