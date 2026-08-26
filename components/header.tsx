import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  IconGitHub,
  IconGroq,
  IconSeparator,
  IconVercel
} from '@/components/ui/icons'
import { Session } from '@/lib/types'

async function UserOrLogin() {
  return (
    <>
      <Link href="https://wow.groq.com/groq-labs/" rel="nofollow">
        <Image
          src="/groqlabs-logo-black.png"
          alt="GroqLabs Logo"
          width={100}
          height={30}
        />
      </Link>

      <div className="flex items-center font-semibold">
        <IconSeparator className="size-6 text-muted-foreground/50" />
        <a href="/new">888 StockBot</a>
        <IconSeparator className="size-6 text-muted-foreground/50" />
        <a
          href="/new"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'ghost' }))}
          style={{ borderRadius: 0, color: '#F55036', padding: '4px' }}
        >
          <span className="flex">Start New Chat</span>
        </a>
      </div>
    </>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 border-b shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center">
        <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
          <UserOrLogin />
        </React.Suspense>
      </div>
      <div className="flex flex-col items-end justify-end space-y-1 text-xs text-right">
        <div className="text-[10px] text-orange-600 leading-snug">
          本機器人沒有提供投資建議，若需要投資建議請用{' '}
          <a
            href="https://t.me/oli_billion_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-orange-700"
          >
            https://t.me/oli_billion_bot
          </a>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <a
            target="_blank"
            href="https://github.com/tbdavid2019/stockbot"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }))}
            style={{ borderRadius: 0 }}
          >
            <IconGitHub />
            <span className="hidden ml-2 md:flex">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  )
}