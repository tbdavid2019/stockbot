'use client'

import { useLocalStorage } from '@/lib/hooks/use-local-storage'

export function EmptyScreen({ wide = false }: { wide?: boolean }) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  return (
    <div
      className={`mx-auto w-full px-3 sm:px-4 ${wide ? 'max-w-6xl' : 'max-w-2xl'}`}
    >
      <div className="flex flex-col gap-2 border bg-background px-5 py-6 sm:p-8">
        <h1 className="text-lg font-semibold sm:text-xl">
          {lang === 'zh'
            ? '歡迎使用 888 StockBot！'
            : 'Welcome to 888 StockBot!'}
        </h1>
      </div>
    </div>
  )
}
