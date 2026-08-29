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
    <section className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
            📌
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              財務指標即時核實
            </p>
            <h3 className="mt-0.5 break-words text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
              {symbol} · {question}
            </h3>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-muted-foreground dark:border-slate-800">
          <span className="size-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          正在連網檢索最新官方財報、季報與申報口徑…
        </div>
      ) : sources.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            即時核實參考來源
          </p>
          <div className="flex flex-wrap gap-2">
            {sources.slice(0, 3).map((source, index) => (
              <a
                key={`${source.url}-${index}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-full truncate rounded-full border border-slate-200 px-3 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
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
