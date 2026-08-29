'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class SafeCardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SafeCardErrorBoundary] Caught error in child component:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-xs space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
            <span>⚠️ 此卡片渲染時遇到非預期狀況，已自動安全保護</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {this.state.error?.message || '組件載入異常，對話歷史與其他分析仍可正常使用。'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="text-xs px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition cursor-pointer"
          >
            🔄 重新渲染卡片
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
