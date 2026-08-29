import { NextRequest, NextResponse } from 'next/server'
import http from 'node:http'

// Vercel Serverless Function 執行時間設定 (允許最多 60 秒)
export const maxDuration = 60
export const dynamic = 'force-dynamic'

// API 設定 - 分開 host 和 port 避免解析問題
const AI_HEDGE_FUND_HOST = process.env.AI_HEDGE_FUND_HOST || 'dns.glsoft.ai'
const AI_HEDGE_FUND_PORT = process.env.AI_HEDGE_FUND_PORT || '6000'
const AI_HEDGE_FUND_FALLBACK_HOST = '46.51.245.98'

// 預設核心分析師團隊 (涵蓋傳奇投資大師與全方位分析模型)
const DEFAULT_ANALYSTS = [
  'warren_buffett',
  'cathie_wood',
  'michael_burry',
  'technical_analyst',
  'valuation_analyst',
  'fundamentals_analyst',
  'charlie_munger',
  'peter_lynch',
  'bill_ackman',
  'wsb'
]

function parsePythonJson(text: string): any {
  const sanitized = text
    .replace(/:\s*NaN\b/g, ': null')
    .replace(/:\s*Infinity\b/g, ': null')
    .replace(/:\s*-Infinity\b/g, ': null')
  return JSON.parse(sanitized)
}

function requestHedgeFundApi(
  host: string,
  port: string | number,
  path: string,
  method: 'GET' | 'POST',
  payload?: any,
  timeoutMs = 55000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : null
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (postData) {
      headers['Content-Length'] = String(Buffer.byteLength(postData))
    }

    const options = {
      hostname: host,
      port: Number(port),
      path,
      method,
      headers,
      timeout: timeoutMs
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(parsePythonJson(data))
          } catch (e: any) {
            reject(new Error(`解析分析數據失敗: ${e.message}`))
          }
        } else {
          try {
            const errJson = JSON.parse(data)
            reject(new Error(errJson.error || `API 回應代碼 ${res.statusCode}`))
          } catch {
            reject(new Error(`API 回應代碼 ${res.statusCode}: ${data.slice(0, 300)}`))
          }
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('AI 分析連線超時（超過 55 秒）'))
    })

    if (postData) {
      req.write(postData)
    }
    req.end()
  })
}

// 查詢異步任務狀態
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('taskId') || searchParams.get('task_id')

    if (!taskId) {
      return NextResponse.json({ error: '缺少 taskId 參數' }, { status: 400 })
    }

    const hostsToTry = [AI_HEDGE_FUND_HOST, AI_HEDGE_FUND_FALLBACK_HOST].filter(Boolean)
    let taskData = null
    let lastError: any = null

    for (const host of hostsToTry) {
      try {
        taskData = await requestHedgeFundApi(host, AI_HEDGE_FUND_PORT, `/api/task/${taskId}`, 'GET', null, 10000)
        if (taskData) break
      } catch (err: any) {
        lastError = err
      }
    }

    if (!taskData) {
      return NextResponse.json(
        { error: lastError?.message || '無法查詢任務狀態' },
        { status: 502 }
      )
    }

    return NextResponse.json(taskData)
  } catch (error: any) {
    return NextResponse.json(
      { error: `查詢任務錯誤: ${error.message}` },
      { status: 500 }
    )
  }
}

function normalizeTickerForBackend(sym: string): string {
  if (!sym) return ''
  let cleaned = sym.trim().toUpperCase()
  cleaned = cleaned.replace(/^(TWSE:|TPEX:|TPE:|ROCO:)/i, '')
  cleaned = cleaned.replace(/^(NASDAQ:|NYSE:|AMEX:|BATS:|ARCA:|INDEX:)/i, '')

  // Hong Kong stock normalization
  if (/^(HKEX|HKG|HK|HKE):/i.test(cleaned)) {
    const code = cleaned.replace(/^(HKEX|HKG|HK|HKE):/i, '').replace(/^0+/, '') || '700'
    return `${code.padStart(4, '0')}.HK`
  }
  const hkMatch = cleaned.match(/^0*(\d{1,5})\.HK$/i)
  if (hkMatch) {
    return `${hkMatch[1].padStart(4, '0')}.HK`
  }

  // Taiwan stock: 4-digit number like 1216, 2330 -> 1216.TW
  if (/^\d{4}$/.test(cleaned)) {
    return `${cleaned}.TW`
  }
  return cleaned
}

// 執行分析 (支援同步與異步任務模式)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tickers,
      selectedAnalysts,
      modelName,
      enableRoundTable = true,
      roundTableRounds = 1,
      async: isAsync = true
    } = body

    if (!tickers) {
      return NextResponse.json(
        { error: '缺少股票代碼 (tickers)' },
        { status: 400 }
      )
    }

    const normalizedTicker = normalizeTickerForBackend(tickers)

    // 如果沒有選擇分析師，使用預設精選列表
    const analysts = (selectedAnalysts && selectedAnalysts.length > 0) 
      ? selectedAnalysts 
      : DEFAULT_ANALYSTS

    const requestPayload: any = {
      tickers: normalizedTicker,
      selectedAnalysts: analysts,
      enableRoundTable,
      roundTableRounds,
      async: isAsync
    }

    if (modelName) {
      requestPayload.modelName = modelName
    }

    console.log('📊 Stock Analysis Request via node:http:', {
      host: AI_HEDGE_FUND_HOST,
      port: AI_HEDGE_FUND_PORT,
      isAsync,
      ...requestPayload
    })

    let data = null
    let lastError: any = null

    const hostsToTry = [AI_HEDGE_FUND_HOST, AI_HEDGE_FUND_FALLBACK_HOST].filter(Boolean)

    // 優先嘗試異步端點 /api/analysis/async，若後端尚未支援則自動降級為同步
    for (const host of hostsToTry) {
      try {
        if (isAsync) {
          try {
            data = await requestHedgeFundApi(host, AI_HEDGE_FUND_PORT, '/api/analysis/async', 'POST', requestPayload, 15000)
            if (data) break
          } catch {
            // 後端若未重啟或不支援 async 端點，嘗試直接向 /api/analysis 傳送 async: true
            data = await requestHedgeFundApi(host, AI_HEDGE_FUND_PORT, '/api/analysis', 'POST', requestPayload, 55000)
            if (data) break
          }
        } else {
          data = await requestHedgeFundApi(host, AI_HEDGE_FUND_PORT, '/api/analysis', 'POST', requestPayload, 55000)
          if (data) break
        }
      } catch (err: any) {
        lastError = err
        console.warn(`⚠️ Failed to connect to ${host}:`, err.message)
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: lastError?.message || '無法連線至 AI 分析後端服務，請確認伺服器狀態。' },
        { status: 502 }
      )
    }

    console.log('✅ Analysis request accepted / processed')
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Stock analysis error:', error)
    return NextResponse.json(
      { error: `分析服務錯誤: ${error.message || '請稍後再試'}` },
      { status: 500 }
    )
  }
}

