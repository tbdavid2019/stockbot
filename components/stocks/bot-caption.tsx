'use client'

import React from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MemoizedReactMarkdown } from '@/components/markdown'
import { CodeBlock } from '@/components/ui/codeblock'
import { FollowupPrompts } from './followup-prompts'
import { CopyButton } from '@/components/copy-button'

interface BotCaptionProps {
  content: string
}

export function BotCaption({ content }: BotCaptionProps) {
  if (!content) return null

  // Check if caption contains suggested follow-ups delimiter
  const parts = content.split(
    /---SUGGESTIONS---|===SUGGESTIONS===|【自主續問建議】|【續問建議】/i
  )

  const mainText = parts[0]?.trim() || ''
  const suggestionsText = parts[1]?.trim() || ''

  let suggestions: string[] = []
  if (suggestionsText) {
    suggestions = suggestionsText
      .split('\n')
      .map(line => line.replace(/^[0-9]+[\.\)]\s*|^[•\-\*]\s*/, '').trim())
      .filter(line => line.length > 2 && !line.startsWith('#'))
  }

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
                if (children.length) {
                  if (children[0] == '▍') {
                    return (
                      <span className="mt-1 animate-pulse cursor-default">
                        ▍
                      </span>
                    )
                  }
                  children[0] = (children[0] as string).replace('`▍`', '▍')
                }

                const match = /language-(\w+)/.exec(className || '')

                if (inline) {
                  return (
                    <code className={className} {...props}>
                      {children}
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
