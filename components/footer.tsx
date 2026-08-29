import React from 'react'

import { cn } from '@/lib/utils'
import { ExternalLink } from '@/components/external-link'

export function FooterText({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'px-2 text-center text-xs leading-normal text-muted-foreground',
        className
      )}
      {...props}
    >
      888 StockBot may provide inaccurate information and does not provide
      investment advice. 本機器人沒有提供投資建議，若需要投資建議請用{' '}
      https://t.me/oli_billion_bot
      <br />
      技術提供{' '}
      <ExternalLink href="https://david888.com">david888.com</ExternalLink>
    </p>
  )
}
