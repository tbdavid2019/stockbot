'use client'

import { ExternalLink } from '@/components/external-link'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'

export function EmptyScreen() {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')

  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 border bg-background p-8">
        <h1 className="text-lg font-semibold">
          {lang === 'zh' ? '歡迎使用 888 StockBot！' : 'Welcome to 888 StockBot!'}
        </h1>
        <p className="leading-normal text-sm">
          {lang === 'zh' ? (
            <>
              透過 AI Function Calling 即時呈現 TradingView 互動式金融圖表、財務數據與多輪 AI 投資分析。支援美股與台灣股票市場！{' '}
              <span className="font-muted-foreground">
                由{' '}
                <ExternalLink href="https://sdk.vercel.ai">
                  Vercel AI SDK
                </ExternalLink>{' '}
                與{' '}
                <ExternalLink href="https://tradingview.com">
                  TradingView Widgets
                </ExternalLink>{' '}
                構建。
              </span>
            </>
          ) : (
            <>
              Open source AI chatbot that uses function calling to render relevant
              TradingView stock market widgets and AI investment analysis.{' '}
              <span className="font-muted-foreground">
                Built with{' '}
                <ExternalLink href="https://sdk.vercel.ai">
                  Vercel AI SDK
                </ExternalLink>{' '}
                and{' '}
                <ExternalLink href="https://tradingview.com">
                  TradingView Widgets
                </ExternalLink>
                .
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
