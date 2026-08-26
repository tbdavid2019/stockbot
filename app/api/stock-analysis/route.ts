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
  'charlie_munger',
  'ben_graham',
  'cathie_wood',
  'michael_burry',
  'peter_lynch',
  'bill_ackman',
  'nancy_pelosi',
  'wsb',
  'technical_analyst',
  'fundamentals_analyst',
  'sentiment_analyst',
  'valuation_analyst'
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
  payload: any,
  timeoutMs = 55000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload)
    const options = {
      hostname: host,
      port: Number(port),
      path: '/api/analysis',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
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
          reject(new Error(`API 回應代碼 ${res.statusCode}: ${data.slice(0, 300)}`))
        }
      })
    })

    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('AI 分析連線超時（超過 55 秒）'))
    })

    req.write(postData)
    req.end()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tickers,
      selectedAnalysts,
      modelName,
      enableRoundTable = true,
      roundTableRounds = 1
    } = body

    if (!tickers) {
      return NextResponse.json(
        { error: '缺少股票代碼 (tickers)' },
        { status: 400 }
      )
    }

    // 如果沒有選擇分析師，使用預設列表
    const analysts = (selectedAnalysts && selectedAnalysts.length > 0) 
      ? selectedAnalysts 
      : DEFAULT_ANALYSTS

    const requestPayload: any = {
      tickers: tickers.toUpperCase(),
      selectedAnalysts: analysts,
      enableRoundTable,
      roundTableRounds
    }

    if (modelName) {
      requestPayload.modelName = modelName
    }

    console.log('📊 Stock Analysis Request via node:http:', {
      host: AI_HEDGE_FUND_HOST,
      port: AI_HEDGE_FUND_PORT,
      ...requestPayload
    })

    let data = null
    let lastError: any = null

    const hostsToTry = [AI_HEDGE_FUND_HOST, AI_HEDGE_FUND_FALLBACK_HOST].filter(Boolean)

    for (const host of hostsToTry) {
      try {
        data = await requestHedgeFundApi(host, AI_HEDGE_FUND_PORT, requestPayload, 55000)
        if (data) break
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

    console.log('✅ Analysis completed successfully')
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Stock analysis error:', error)
    return NextResponse.json(
      { error: `分析服務錯誤: ${error.message || '請稍後再試'}` },
      { status: 500 }
    )
  }
}
