import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { readUrl2MD } from '@/lib/2md'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isSafeApiBaseUrl } from '@/lib/security-url'

export const maxDuration = 60 // 60 seconds budget for PDF parsing & LLM extraction
export const dynamic = 'force-dynamic'

interface DeckCacheEntry {
  markdown: string
  aiSummary?: string
  expiresAt: number
}

// 5-minute in-memory cache to prevent repeatedly re-parsing large presentation PDFs
const deckCache = new Map<string, DeckCacheEntry>()
const DECK_CACHE_TTL_MS = 300_000 // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = checkRateLimit(`parse_deck:${ip}`, { maxRequests: 8, intervalMs: 60000 })
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: '簡報解析請求過於頻繁，請於一分鐘後再試。' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { deckUrl, symbol, companyName, userKeyConfig } = body

    if (!deckUrl || typeof deckUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: '未提供法說會簡報連結 (deckUrl)' },
        { status: 400 }
      )
    }

    // SSRF validation on deckUrl
    const safeUrlCheck = isSafeApiBaseUrl(deckUrl)
    if (!safeUrlCheck.safe) {
      return NextResponse.json(
        { success: false, error: `不安全的簡報連結：${safeUrlCheck.reason}` },
        { status: 400 }
      )
    }

    const targetSymbol = symbol || '公司'
    const targetName = companyName || targetSymbol
    const now = Date.now()

    // Check in-memory deck cache
    const cachedEntry = deckCache.get(deckUrl)
    if (cachedEntry && cachedEntry.expiresAt > now && cachedEntry.aiSummary) {
      return NextResponse.json({
        success: true,
        deckUrl,
        symbol: targetSymbol,
        companyName: targetName,
        aiSummary: cachedEntry.aiSummary,
        source: '2MD AnyDoc + AI Guidance Engine (Cached)'
      })
    }

    // 1. Fetch & parse presentation deck via 2MD Reader
    let parsedMarkdown = cachedEntry?.markdown || ''
    if (!parsedMarkdown) {
      try {
        parsedMarkdown = await readUrl2MD(deckUrl)
      } catch (readErr: any) {
        console.error('[parse-earnings-deck] 2MD Read error:', readErr)
        return NextResponse.json(
          { success: false, error: '無法讀取或解析該簡報檔案，請直接點擊簡報下載連結查閱。' },
          { status: 502 }
        )
      }
    }

    if (!parsedMarkdown || parsedMarkdown.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: '簡報內容過短或上游伺服器限制存取，請點擊連結下載原檔。' },
        { status: 502 }
      )
    }

    // Cache the parsed markdown
    deckCache.set(deckUrl, {
      markdown: parsedMarkdown,
      expiresAt: now + DECK_CACHE_TTL_MS
    })

    // 2. Setup LLM provider (BYOK priority, then Primary/Fallback)
    let apiKey = process.env.PRIMARY_API_KEY || process.env.OPENAI_API_KEY
    let baseURL = process.env.PRIMARY_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    let modelName = process.env.PRIMARY_MODEL || process.env.MODEL || 'gpt-4o-mini'

    if (userKeyConfig?.apiKey && userKeyConfig.apiKey.trim().length > 5) {
      const byokUrl = userKeyConfig.baseURL || 'https://api.openai.com/v1'
      const checkByok = isSafeApiBaseUrl(byokUrl)
      if (checkByok.safe) {
        apiKey = userKeyConfig.apiKey.trim()
        baseURL = byokUrl
        modelName = userKeyConfig.model || 'gpt-4o-mini'
      }
    }

    // 3. AI extraction of Guidance and CapEx
    const truncatedContent = parsedMarkdown.slice(0, 16000)

    if (apiKey) {
      try {
        const client = createOpenAI({ baseURL, apiKey })
        const prompt = `你是頂級機構法人資深半導體與科技股產業分析師。
請根據以下【${targetName} (${targetSymbol})】法人說明會簡報之萃取內容，精準提煉關鍵營運與財務指引：

【輸出要求（繁體中文）】：
請以精簡專業的條列格式回答：
1. 🧭 **經營層營收與財務指引 (Guidance)**：下一季與全年營收預估、季增/年增率、毛利率與營業利益率展望區間。
2. 🏭 **資本支出 (CapEx) 與產能規劃**：全年 CapEx 金額預估、主要投資項目（先進製程、封裝、廠房建設）、折舊費用趨勢。
3. 🚀 **業務亮點與新技術/產品進展**：關鍵客戶需求動態、新架構/新產品量產時程、市場滲透率。
4. ⚠️ **潛在風險與營運逆風**：匯率變動、地緣政治、終端庫存調整或同業競爭壓力。

【簡報內容截錄】：
${truncatedContent}`

        const { text } = await generateText({
          model: client(modelName),
          prompt,
          abortSignal: AbortSignal.timeout(20000)
        })

        const aiSummary = text.trim()

        // Update cache with AI summary
        deckCache.set(deckUrl, {
          markdown: parsedMarkdown,
          aiSummary,
          expiresAt: now + DECK_CACHE_TTL_MS
        })

        return NextResponse.json({
          success: true,
          deckUrl,
          symbol: targetSymbol,
          companyName: targetName,
          aiSummary,
          source: '2MD AnyDoc + AI Guidance Engine'
        })
      } catch (aiErr: any) {
        console.warn('[parse-earnings-deck] LLM extraction failed, using fallback:', aiErr?.message)
      }
    }

    // Fallback if LLM unavailable: Return clean markdown excerpt
    const cleanExcerpt = truncatedContent
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 30)
      .join('\n')

    const fallbackSummary = `### 📄 法說會簡報摘要內容：\n\n${cleanExcerpt}\n\n*(提示：已完成 2MD 簡報秒級解析，可點擊原檔連結查閱完整圖表)*`

    return NextResponse.json({
      success: true,
      deckUrl,
      symbol: targetSymbol,
      companyName: targetName,
      aiSummary: fallbackSummary,
      source: '2MD AnyDoc Fast Parser'
    })
  } catch (err: any) {
    console.error('[API /api/parse-earnings-deck] Error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || '內部伺服器處理錯誤' },
      { status: 500 }
    )
  }
}
