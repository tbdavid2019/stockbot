'use client'

import React from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MemoizedReactMarkdown } from '@/components/markdown'
import { CodeBlock } from '@/components/ui/codeblock'
import { FollowupPrompts } from './followup-prompts'
import { CopyButton } from '@/components/copy-button'
import { parseCaptionWithFollowups } from '@/lib/followup-suggestions'

interface BotCaptionProps {
  content: string
}

export function BotCaption({ content }: BotCaptionProps) {
  if (!content) return null

  const { mainText, suggestions } = parseCaptionWithFollowups(content)

  return (
    <div className="mt-4 space-y-3 border-t border-border/40 pt-3 text-sm leading-relaxed text-foreground">
      {mainText && (
        <div className="relative group/caption">
          <MemoizedReactMarkdown
            className="prose max-w-none break-words dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-headings:font-semibold prose-headings:text-foreground prose-h3:text-base prose-h3:mt-3.5 prose-h3:mb-1.5 prose-ul:my-2 prose-li:my-0.5 text-sm w-full"
            remarkPlugins={[remarkGfm, remarkMath]}
            components={{
              p({ children }) {
                return (
                  <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
                )
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
            {mainText}
          </MemoizedReactMarkdown>
          <div className="mt-2.5 flex items-center justify-end">
            <CopyButton
              value={mainText}
              showLabel
              label="複製文字"
              copiedLabel="已複製"
            />
          </div>
        </div>
      )}
      {suggestions.length > 0 && <FollowupPrompts prompts={suggestions} />}
    </div>
  )
}
