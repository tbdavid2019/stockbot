'use client'

import { useLocalStorage } from '@/lib/hooks/use-local-storage'

export function EmptyScreen() {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 border bg-background p-8">
        <h1 className="text-lg font-semibold">
          {lang === 'zh'
            ? '歡迎使用 888 StockBot！'
            : 'Welcome to 888 StockBot!'}
        </h1>
      </div>
    </div>
  )
}
