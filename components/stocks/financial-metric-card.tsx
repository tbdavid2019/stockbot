import type { TwoMDResultItem } from '@/lib/2md'

interface FinancialMetricCardProps {
  symbol: string
  question: string
  sources?: TwoMDResultItem[]
  loading?: boolean
}

export function FinancialMetricCard({
  symbol,
  question,
  sources = [],
  loading = false
}: FinancialMetricCardProps) {
  return (
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
            📌
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              財務數據即時核實
            </p>
            <h3 className="mt-1 break-words text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-2xl tracking-tight">
              {symbol} · {question}
            </h3>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-3.5 text-xs sm:text-sm text-muted-foreground dark:border-slate-800">
          <span className="size-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          正在連網檢索最新官方財報、季報與申報口徑…
        </div>
      ) : sources.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
          <p className="mb-2 text-xs sm:text-sm font-semibold text-muted-foreground">
            即時核實參考來源
          </p>
          <div className="flex flex-wrap gap-2">
            {sources.slice(0, 3).map((source, index) => (
              <a
                key={`${source.url}-${index}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-full truncate rounded-full border border-slate-200 px-3.5 py-1 text-xs sm:text-sm text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
              >
                {index + 1}. {source.title}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
