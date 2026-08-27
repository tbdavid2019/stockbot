import * as React from 'react'

export function MissingApiKeyBanner({
  missingKeys
}: {
  missingKeys: string[]
}) {
  if (!missingKeys || missingKeys.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 my-2">
      <div className="text-amber-800 dark:text-amber-300 font-medium text-sm">
        ⚠️ 未檢測到 LLM API Key (Missing API Key)
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
        請在環境變數或 Vercel 後台設定 <code className="font-mono font-semibold">PRIMARY_API_KEY</code>（或 <code className="font-mono font-semibold">OPENAI_API_KEY</code> / <code className="font-mono font-semibold">GROQ_API_KEY</code> / <code className="font-mono font-semibold">FALLBACK_1_API_KEY</code>）。
      </p>
    </div>
  )
}
