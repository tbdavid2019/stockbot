'use client'

import { useCallback, useEffect, useState } from 'react'

export type ApiKeyProvider = 'openai' | 'groq' | 'gemini' | 'deepseek' | 'custom'

export interface UserApiKeyConfig {
  provider: ApiKeyProvider
  apiKey: string
  baseURL?: string
  model?: string
  toolModel?: string
}

export const USER_API_KEY_STORAGE_KEY = 'stockbot_user_api_key_config'
export const LEGACY_GROQ_KEY_STORAGE_KEY = 'groqKey'
export const API_KEY_UPDATED_EVENT = 'stockbot-api-key-updated'
export const OPEN_API_KEY_DIALOG_EVENT = 'stockbot-open-api-key-dialog'

export const PROVIDER_PRESETS: Record<
  ApiKeyProvider,
  {
    name: string
    defaultBaseURL: string
    defaultModel: string
    defaultToolModel: string
    placeholder: string
    keyPrefixHint: string
  }
> = {
  openai: {
    name: 'OpenAI',
    defaultBaseURL: 'https://api.openai.com/v1',
    defaultModel: '',
    defaultToolModel: '',
    placeholder: 'sk-proj-... 或 sk-...',
    keyPrefixHint: 'sk-'
  },
  groq: {
    name: 'Groq (極速推理)',
    defaultBaseURL: 'https://api.groq.com/openai/v1',
    defaultModel: '',
    defaultToolModel: '',
    placeholder: 'gsk_...',
    keyPrefixHint: 'gsk_'
  },
  gemini: {
    name: 'Google Gemini',
    defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-flash-latest',
    defaultToolModel: 'gemini-flash-latest',
    placeholder: 'AIza...',
    keyPrefixHint: 'AIza'
  },
  deepseek: {
    name: 'DeepSeek',
    defaultBaseURL: 'https://api.deepseek.com/v1',
    defaultModel: '',
    defaultToolModel: '',
    placeholder: 'sk-...',
    keyPrefixHint: 'sk-'
  },
  custom: {
    name: '自訂相容端點 (Custom)',
    defaultBaseURL: 'https://api.openai.com/v1',
    defaultModel: '',
    defaultToolModel: '',
    placeholder: '自訂 API Key',
    keyPrefixHint: ''
  }
}

/**
 * 智慧根據 Key 前綴自動偵測 Provider
 */
export function detectProviderFromKey(key: string, currentProvider?: ApiKeyProvider): ApiKeyProvider {
  const trimmed = key.trim()
  if (trimmed.startsWith('gsk_')) return 'groq'
  if (trimmed.startsWith('AIza')) return 'gemini'
  if (trimmed.startsWith('sk-')) {
    if (currentProvider === 'deepseek' || currentProvider === 'custom') {
      return currentProvider
    }
    return 'openai'
  }
  return currentProvider || 'custom'
}

/**
 * 從本機 LocalStorage 讀取當前使用者自訂 Key 設定
 */
export function getStoredApiKeyConfig(): UserApiKeyConfig | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(USER_API_KEY_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as UserApiKeyConfig
      if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.trim().length > 0) {
        // Upgrade the former Gemini preset while preserving explicitly chosen models.
        if (parsed.provider === 'gemini' && (!parsed.baseURL || parsed.baseURL.replace(/\/+$/, '') === PROVIDER_PRESETS.gemini.defaultBaseURL.replace(/\/+$/, ''))) {
          if (!parsed.model || parsed.model === 'gemini-2.5-flash') parsed.model = PROVIDER_PRESETS.gemini.defaultModel
          if (!parsed.toolModel || parsed.toolModel === 'gemini-2.5-flash') parsed.toolModel = parsed.model
        }
        return parsed
      }
    }

    // 向後相容舊版 groqKey
    const legacyGroqKey = window.localStorage.getItem(LEGACY_GROQ_KEY_STORAGE_KEY)
    if (legacyGroqKey && legacyGroqKey.trim().length > 0) {
      const trimmed = legacyGroqKey.trim()
      const provider = detectProviderFromKey(trimmed)
      const preset = PROVIDER_PRESETS[provider]
      return {
        provider,
        apiKey: trimmed,
        baseURL: preset.defaultBaseURL,
        model: preset.defaultModel,
        toolModel: preset.defaultToolModel
      }
    }
  } catch (e) {
    console.warn('[useUserApiKey] Failed to parse stored API key config:', e)
  }

  return null
}

/**
 * 觸發開啟自備金鑰設定 Dialog
 */
export function openApiKeyDialog() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_API_KEY_DIALOG_EVENT))
  }
}

/**
 * 存取與監聽使用者自訂 API Key 的 React Hook
 */
export function useUserApiKey() {
  const [config, setConfig] = useState<UserApiKeyConfig | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // 初始讀取
  useEffect(() => {
    setConfig(getStoredApiKeyConfig())
    setIsLoaded(true)
  }, [])

  // 跨視窗與事件同步
  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getStoredApiKeyConfig())
    }

    window.addEventListener(API_KEY_UPDATED_EVENT, handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      window.removeEventListener(API_KEY_UPDATED_EVENT, handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const saveConfig = useCallback((newConfig: UserApiKeyConfig | null) => {
    if (typeof window === 'undefined') return

    if (!newConfig || !newConfig.apiKey.trim()) {
      window.localStorage.removeItem(USER_API_KEY_STORAGE_KEY)
      window.localStorage.removeItem(LEGACY_GROQ_KEY_STORAGE_KEY)
      setConfig(null)
    } else {
      const cleaned: UserApiKeyConfig = {
        provider: newConfig.provider,
        apiKey: newConfig.apiKey.trim(),
        baseURL: newConfig.baseURL?.trim() || PROVIDER_PRESETS[newConfig.provider].defaultBaseURL,
        model: newConfig.model?.trim() || PROVIDER_PRESETS[newConfig.provider].defaultModel,
        toolModel: newConfig.toolModel?.trim() || newConfig.model?.trim() || ''
      }
      window.localStorage.setItem(USER_API_KEY_STORAGE_KEY, JSON.stringify(cleaned))
      // 保持 groqKey 相容性
      if (cleaned.provider === 'groq') {
        window.localStorage.setItem(LEGACY_GROQ_KEY_STORAGE_KEY, cleaned.apiKey)
      } else {
        window.localStorage.removeItem(LEGACY_GROQ_KEY_STORAGE_KEY)
      }
      setConfig(cleaned)
    }

    window.dispatchEvent(new CustomEvent(API_KEY_UPDATED_EVENT))
  }, [])

  const clearConfig = useCallback(() => {
    saveConfig(null)
  }, [saveConfig])

  // 回傳序列化字串供 Server Action 傳遞，若無設定則回傳空字串
  const serializedConfig = config && config.apiKey ? JSON.stringify(config) : ''

  return {
    config,
    isLoaded,
    hasCustomKey: Boolean(config && config.apiKey.trim().length > 0),
    serializedConfig,
    saveConfig,
    clearConfig,
    openDialog: openApiKeyDialog
  }
}
