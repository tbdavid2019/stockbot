'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { IconCheck, IconCopy } from '@/components/ui/icons'
import { useCopyToClipboard } from '@/lib/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

interface CopyButtonProps extends React.ComponentProps<typeof Button> {
  value: string
  showLabel?: boolean
  label?: string
  copiedLabel?: string
}

export function CopyButton({
  value,
  className,
  showLabel = false,
  label = '複製',
  copiedLabel = '已複製',
  variant = 'ghost',
  size = 'icon',
  ...props
}: CopyButtonProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCopied) return
    copyToClipboard(value)
  }

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size={size === 'icon' ? 'sm' : size}
        className={cn(
          'h-7 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/60 shadow-xs',
          isCopied && 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20',
          className
        )}
        onClick={onCopy}
        {...props}
      >
        {isCopied ? (
          <>
            <IconCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">{copiedLabel}</span>
          </>
        ) : (
          <>
            <IconCopy className="size-3.5" />
            <span>{label}</span>
          </>
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        'size-7 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/60',
        isCopied && 'text-emerald-600 dark:text-emerald-400',
        className
      )}
      onClick={onCopy}
      title={isCopied ? copiedLabel : label}
      {...props}
    >
      {isCopied ? (
        <IconCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <IconCopy className="size-3.5" />
      )}
      <span className="sr-only">{isCopied ? copiedLabel : label}</span>
    </Button>
  )
}
