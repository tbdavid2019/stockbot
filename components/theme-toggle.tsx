'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { IconMoon, IconSun } from '@/components/ui/icons'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [_, startTransition] = React.useTransition()

  return (
    <div className="flex shrink-0 items-center justify-center">
      <Button
        size="icon"
        variant="ghost"
        className="size-8 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        aria-label="切換深色模式"
        title="切換深色模式"
        onClick={() => {
          startTransition(() => {
            setTheme(theme === 'light' ? 'dark' : 'light')
          })
        }}
      >
        {!theme ? null : theme === 'dark' ? (
          <IconMoon className="transition-all" />
        ) : (
          <IconSun className="transition-all" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  )
}
