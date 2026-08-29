'use client'

import { useLocalStorage } from '@/lib/hooks/use-local-storage'

export function EmptyScreen({ wide = false }: { wide?: boolean }) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  return (
    <div className={`mx-auto px-4 ${wide ? 'max-w-6xl' : 'max-w-2xl'}`}>
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
