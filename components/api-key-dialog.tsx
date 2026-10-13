'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  useUserApiKey,
  ApiKeyProvider,
  PROVIDER_PRESETS,
  OPEN_API_KEY_DIALOG_EVENT,
  detectProviderFromKey,
  UserApiKeyConfig
} from '@/lib/hooks/use-user-api-key'
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

export function ApiKeyDialog() {
  const { config, hasCustomKey, saveConfig, clearConfig } = useUserApiKey()
  const [isOpen, setIsOpen] = React.useState(false)

  // 表單內部狀態
  const [provider, setProvider] = React.useState<ApiKeyProvider>('openai')
  const [apiKey, setApiKey] = React.useState('')
  const [baseURL, setBaseURL] = React.useState('')
  const [model, setModel] = React.useState('')
  const [showKey, setShowKey] = React.useState(false)
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // 測試連線狀態
  const [isTesting, setIsTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    success: boolean
    message: string
  } | null>(null)

  // 監聽全域事件開啟
  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener(OPEN_API_KEY_DIALOG_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_API_KEY_DIALOG_EVENT, handleOpen)
  }, [])

  // 當 Dialog 打開時，帶入當前設定
  React.useEffect(() => {
    if (isOpen) {
      if (config) {
        setProvider(config.provider || 'openai')
        setApiKey(config.apiKey || '')
        setBaseURL(config.baseURL || PROVIDER_PRESETS[config.provider || 'openai'].defaultBaseURL)
        setModel(config.model || PROVIDER_PRESETS[config.provider || 'openai'].defaultModel)
      } else {
        setProvider('openai')
        setApiKey('')
        setBaseURL(PROVIDER_PRESETS.openai.defaultBaseURL)
        setModel(PROVIDER_PRESETS.openai.defaultModel)
      }
      setTestResult(null)
      setShowKey(false)
    }
  }, [isOpen, config])

  // 切換 Provider 時自動填入預設 BaseURL 與 Model
  const handleProviderChange = (newProvider: ApiKeyProvider) => {
    setProvider(newProvider)
    const preset = PROVIDER_PRESETS[newProvider]
    setBaseURL(preset.defaultBaseURL)
    setModel(preset.defaultModel)
    setTestResult(null)
  }

  // 貼上或輸入金鑰時，自動辨識 Provider
  const handleKeyChange = (val: string) => {
    setApiKey(val)
    setTestResult(null)
    const detected = detectProviderFromKey(val, provider)
    if (detected !== provider && detected !== 'custom') {
      setProvider(detected)
      const preset = PROVIDER_PRESETS[detected]
      setBaseURL(preset.defaultBaseURL)
      setModel(preset.defaultModel)
    }
  }

  // 測試連線
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast.error('請先輸入 API Key 再進行連線測試')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          baseURL: baseURL.trim() || PROVIDER_PRESETS[provider].defaultBaseURL,
          model: model.trim() || PROVIDER_PRESETS[provider].defaultModel
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || '連線測試成功！'
        })
        toast.success('金鑰驗證成功！')
      } else {
        setTestResult({
          success: false,
          message: data.error || '連線測試失敗'
        })
        toast.error(data.error || '連線測試失敗')
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || '網路連線異常'
      })
      toast.error('網路連線異常，請稍後再試')
    } finally {
      setIsTesting(false)
    }
  }

  // 儲存金鑰設定
  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('請輸入有效的 API Key')
      return
    }

    const newConfig: UserApiKeyConfig = {
      provider,
      apiKey: apiKey.trim(),
      baseURL: baseURL.trim() || PROVIDER_PRESETS[provider].defaultBaseURL,
      model: model.trim() || PROVIDER_PRESETS[provider].defaultModel,
      toolModel: model.trim() || PROVIDER_PRESETS[provider].defaultToolModel
    }

    saveConfig(newConfig)
    toast.success('自備金鑰已儲存於本機瀏覽器！')
    setIsOpen(false)
  }

  // 清除自備金鑰（恢復系統免費）
  const handleClear = () => {
    clearConfig()
    setApiKey('')
    setTestResult(null)
    toast.success('已清除自備金鑰，恢復使用伺服器預設免費額度')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg overflow-hidden border border-border/80 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:rounded-2xl">
        {/* Header 頂部導角裝飾 */}
        <div className="relative border-b border-border/60 bg-muted/30 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400">
              <KeyRound className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                自備金鑰設定 (BYOK)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                自備 API Key 暢享無限制分析 · 伺服器零留存保證
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* 安全保證卡片 */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                  純本機儲存 · 伺服器絕不留存
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  您的金鑰僅儲存於您目前的瀏覽器 LocalStorage。發起分析時僅透過伺服器記憶體無狀態轉發，完成即銷毀，絕不寫入伺服器硬碟或資料庫。
                </p>
              </div>
            </div>
          </div>

          {/* Provider 選擇分頁 */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              選擇模型提供商 (Provider)
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {(['openai', 'groq', 'gemini', 'deepseek', 'custom'] as ApiKeyProvider[]).map(
                p => {
                  const preset = PROVIDER_PRESETS[p]
                  const isSelected = provider === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProviderChange(p)}
                      className={`relative flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-orange-500/60 bg-orange-500/10 font-semibold text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className="truncate">{preset.name.split(' ')[0]}</span>
                      {isSelected && <Check className="size-3.5 text-orange-500 shrink-0" />}
                    </button>
                  )
                }
              )}
            </div>
          </div>

          {/* API Key 輸入框 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                {PROVIDER_PRESETS[provider].name} API Key
              </label>
              {provider === 'groq' && (
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline dark:text-orange-400"
                >
                  免費取得 Groq Key <ExternalLink className="size-2.5" />
                </a>
              )}
              {provider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline dark:text-orange-400"
                >
                  免費取得 Gemini Key <ExternalLink className="size-2.5" />
                </a>
              )}
              {provider === 'openai' && (
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline dark:text-orange-400"
                >
                  前往 OpenAI 控制台 <ExternalLink className="size-2.5" />
                </a>
              )}
              {provider === 'deepseek' && (
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-orange-600 hover:underline dark:text-orange-400"
                >
                  前往 DeepSeek 平台 <ExternalLink className="size-2.5" />
                </a>
              )}
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => handleKeyChange(e.target.value)}
                placeholder={PROVIDER_PRESETS[provider].placeholder}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title={showKey ? '隱藏金鑰' : '顯示金鑰'}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              支援智慧貼上識別（貼入 gsk_ 或 AIza 自動辨識提供商）。
            </p>
          </div>

          {/* 進階設定開關 */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              <span>進階端點與模型自訂設定</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">API Base URL</label>
                  <input
                    type="text"
                    value={baseURL}
                    onChange={e => setBaseURL(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Model 名稱</label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder={PROVIDER_PRESETS[provider].defaultModel}
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    若為自訂端點（如 OpenRouter / Ollama），請確保模型名稱支援 Function Calling。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 連線測試結果反饋 */}
          {testResult && (
            <div
              className={`rounded-lg border p-2.5 text-xs ${
                testResult.success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <Check className="size-4 shrink-0" />
                ) : (
                  <AlertCircle className="size-4 shrink-0" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕區 */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-3.5">
          <div>
            {hasCustomKey && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                title="清除目前金鑰，恢復使用伺服器預設免費額度"
              >
                <Trash2 className="size-3.5" />
                清除自備金鑰
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting || !apiKey.trim()}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  測試中...
                </>
              ) : (
                '測試連線'
              )}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-700 active:scale-[0.98]"
            >
              <Sparkles className="size-3.5" />
              儲存並啟用
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
