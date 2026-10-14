import { NextRequest, NextResponse } from 'next/server'
import { fetchByokModels, ModelListError } from '@/lib/byok-models'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const maxDuration = 15
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const reply = (body: object, status = 200) => NextResponse.json(body, {
    status, headers: { 'Cache-Control': 'no-store' }
  })
  if (!checkRateLimit(`byok_models:${getClientIp(req)}`, { maxRequests: 20, intervalMs: 60000 }).success) {
    return reply({ error: '載入次數較頻繁，請稍後重試。' }, 429)
  }
  try {
    const body = await req.json()
    if (typeof body.apiKey !== 'string' || body.apiKey.trim().length < 5 || body.apiKey.length > 4096 ||
      typeof body.baseURL !== 'string' || body.baseURL.length > 2048) {
      return reply({ error: '請提供有效金鑰與 API Base URL。' }, 400)
    }
    const models = await fetchByokModels(body.baseURL.trim(), body.apiKey.trim(), fetch, AbortSignal.timeout(8000))
    return reply({ models, fetchedAt: new Date().toISOString() })
  } catch (error) {
    if (error instanceof ModelListError) return reply({ error: error.message }, error.status)
    return reply({ error: '模型清單載入逾時或連線失敗，可重試或手動輸入模型名称。' }, 502)
  }
}
