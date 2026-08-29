'use client'

import { useEffect, useState } from 'react'

const TITLES = {
  zh: '888 StockBot - 即時股票圖表與市場分析',
  en: '888 StockBot - Live Stock Charts & Market Analysis'
} as const

export function DocumentLocale() {
  const [lang, setLang] = useState<'zh' | 'en'>('en')

  useEffect(() => {
    const syncDocumentLocale = () => {
      let nextLang: 'zh' | 'en' = 'en'

      try {
        const storedLang = localStorage.getItem('stockbot_lang')
        if (storedLang) {
          const parsedLang = JSON.parse(storedLang)
          if (parsedLang === 'zh' || parsedLang === 'en') nextLang = parsedLang
        } else if (navigator.language.toLowerCase().startsWith('zh')) {
          nextLang = 'zh'
        }
      } catch {
        // Keep the neutral English fallback when browser storage is unavailable.
      }

      setLang(nextLang)
    }

    syncDocumentLocale()
    window.addEventListener('local-storage-change', syncDocumentLocale)

    return () =>
      window.removeEventListener('local-storage-change', syncDocumentLocale)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en'
    document.title = TITLES[lang]
  }, [lang])

  return null
}
