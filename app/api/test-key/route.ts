import { NextRequest, NextResponse } from 'next/server'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isSafeApiBaseUrl } from '@/lib/security-url'

export const maxDuration = 15
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rateLimit = checkRateLimit(`test_key:${ip}`, { maxRequests: 20, intervalMs: 60000 })
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: '測試次數過於頻繁，請稍後再試。' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { apiKey, baseURL, model } = body

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: '請提供有效的 API Key' },
        { status: 400 }
      )
    }

    const testBaseURL = (baseURL && typeof baseURL === 'string' && baseURL.trim()) 
      ? baseURL.trim() 
      : 'https://api.openai.com/v1'

    const safeCheck = isSafeApiBaseUrl(testBaseURL)
    if (!safeCheck.safe) {
      return NextResponse.json(
        { success: false, error: safeCheck.reason || '不合法的 API Base URL' },
        { status: 400 }
      )
    }

    if (typeof model !== 'string' || !model.trim()) {
      return NextResponse.json({ success: false, error: '請先載入模型清單並選擇模型，或手動輸入模型名稱。' }, { status: 400 })
    }
    const testModel = model.trim()

    const client = createOpenAI({
      baseURL: testBaseURL,
      apiKey: apiKey.trim()
    })

    // 發起一次極輕量的 1 token 測試
    const abortController = new AbortController()
    const timer = setTimeout(() => abortController.abort(), 7000)

    try {
      const result = await generateText({
        model: client(testModel),
        prompt: 'test',
        maxTokens: 1,
        abortSignal: abortController.signal
      })

      clearTimeout(timer)
      return NextResponse.json({
        success: true,
        message: '連線成功！金鑰與模型驗證通過。',
        model: testModel
      })
    } catch (testErr: any) {
      clearTimeout(timer)
      const errMsg = testErr?.message || String(testErr)
      console.warn('[test-key] Test connection failed:', errMsg)

      if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('invalid api key')) {
        return NextResponse.json({
          success: false,
          error: '金鑰無效或授權失敗 (401 Unauthorized)。請檢查 API Key 是否填寫正確。'
        }, { status: 401 })
      }

      if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit')) {
        return NextResponse.json({
          success: false,
          error: '此金鑰額度已耗盡或觸發頻率限制 (429 Too Many Requests / Quota Exceeded)。'
        }, { status: 429 })
      }

      return NextResponse.json({
        success: false,
        error: `連線或測試失敗: ${errMsg}`
      }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || '內部伺服器錯誤'
    }, { status: 500 })
  }
}
