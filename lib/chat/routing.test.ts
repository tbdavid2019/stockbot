import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inferDeterministicTool,
  inferSemanticToolWithClef,
  isPlausibleFinancialQuery
} from './routing.ts'
import { _resetClefStateForTests } from '../clef.ts'

const originalFetch = globalThis.fetch

function restoreFetch() {
  globalThis.fetch = originalFetch
}

test('routes a resolved natural-language company question to the profile tool', () => {
  assert.equal(
    inferDeterministicTool('儒鴻是做什麼的公司？', '1476.TW'),
    'showStockCompanyProfile'
  )
})

test('routes business-description wording to the profile tool even before symbol resolution', () => {
  assert.equal(
    inferDeterministicTool('這家公司主要做什麼？'),
    'showStockCompanyProfile'
  )
})

test('Clef System One semantically routes institutional flow query', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      model: 'clef-flash',
      answers: {
        intent: {
          type: 'choice',
          choice: 'institutional_flow',
          confidence: 0.95,
          probabilities: { institutional_flow: 0.95 }
        }
      }
    })
  })) as any

  const tool = await inferSemanticToolWithClef('外資最近在倒貨嗎？', '2330')
  assert.equal(tool, 'showInstitutionalFlow')
})

test('Clef System One semantically routes company profile query', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      model: 'clef-flash',
      answers: {
        intent: {
          type: 'choice',
          choice: 'company_profile',
          confidence: 0.96,
          probabilities: { company_profile: 0.96 }
        }
      }
    })
  })) as any

  const tool = await inferSemanticToolWithClef('這家公司到底在賣什麼產品？', '2330')
  assert.equal(tool, 'showStockCompanyProfile')
})

test('Clef System One does not force answerFinancialMetric when ticker is unresolved', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      model: 'clef-flash',
      answers: {
        intent: {
          type: 'choice',
          choice: 'financial_metric',
          confidence: 0.98,
          probabilities: { financial_metric: 0.98 }
        }
      }
    })
  })) as any

  // Without resolvedTicker, concept explanation or unknown company queries should not be forced into answerFinancialMetric
  const tool = await inferSemanticToolWithClef('毛利率怎麼計算？')
  assert.equal(tool, undefined)

  // With resolvedTicker, it routes correctly
  const toolWithTicker = await inferSemanticToolWithClef('毛利率是多少？', '2330')
  assert.equal(toolWithTicker, 'answerFinancialMetric')
})

test('Clef System One skips ordinary conversational greetings without network requests', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  let fetchCalled = false
  globalThis.fetch = (async () => {
    fetchCalled = true
    throw new Error('Should not make network fetch for greetings')
  }) as any

  assert.equal(isPlausibleFinancialQuery('你好'), false)
  assert.equal(isPlausibleFinancialQuery('hello'), false)
  assert.equal(isPlausibleFinancialQuery('早安！今天天氣真好'), false)
  assert.equal(isPlausibleFinancialQuery('謝謝你'), false)
  // Greetings must be skipped even when a resolved ticker is inherited from context
  assert.equal(isPlausibleFinancialQuery('thanks', '2330'), false)
  assert.equal(isPlausibleFinancialQuery('謝謝你', '2330'), false)
  assert.equal(isPlausibleFinancialQuery('你好', '2330'), false)

  // Non-financial follow-ups (rewriting, translation, general questions, pronouns like 'I') must be skipped
  // even when a resolved ticker is inherited from prior conversation context
  assert.equal(isPlausibleFinancialQuery('請幫我重寫這段文字', '2330'), false)
  assert.equal(isPlausibleFinancialQuery('幫我翻譯成英文', '2330'), false)
  assert.equal(isPlausibleFinancialQuery('Can you write a poem?', 'AAPL'), false)
  assert.equal(isPlausibleFinancialQuery('Please explain this in simpler terms', 'AAPL'), false)
  assert.equal(isPlausibleFinancialQuery('Why is the sky blue?', 'TSLA'), false)
  assert.equal(isPlausibleFinancialQuery("I think that's enough", '2330'), false)

  // Non-financial follow-ups must NOT be forced into showStockCompanyProfile
  assert.equal(inferDeterministicTool('請幫我重寫這段文字', '2330'), undefined)
  assert.equal(inferDeterministicTool('幫我翻譯成英文', '2330'), undefined)
  assert.equal(inferDeterministicTool("I think that's enough", '2330'), undefined)

  // Legitimate financial queries must be detected
  assert.equal(isPlausibleFinancialQuery('show AAPL chart'), true)
  assert.equal(isPlausibleFinancialQuery('What is the stock price?'), true)
  assert.equal(isPlausibleFinancialQuery('2330 營收是多少'), true)
  assert.equal(isPlausibleFinancialQuery('外資在買還是賣？', '2330'), true)
  assert.equal(isPlausibleFinancialQuery('這家公司主要做什麼？', '2330'), true)

  const toolGreeting = await inferSemanticToolWithClef('你好', '2330')
  assert.equal(toolGreeting, undefined)

  const toolRewrite = await inferSemanticToolWithClef('請幫我重寫這段文字', '2330')
  assert.equal(toolRewrite, undefined)
  assert.equal(fetchCalled, false, 'Network fetch must not be invoked for non-financial follow-ups even with ticker context')
})

test('Clef System One does not force trackInvestmentSignal when ticker is unresolved', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      model: 'clef-flash',
      answers: {
        intent: {
          type: 'choice',
          choice: 'signal_tracker',
          confidence: 0.95,
          probabilities: { signal_tracker: 0.95 }
        }
      }
    })
  })) as any

  // Without resolvedTicker, generic signal tracking questions should not force trackInvestmentSignal
  const tool = await inferSemanticToolWithClef('這個投資論點被證偽了嗎？')
  assert.equal(tool, undefined)

  // With resolvedTicker, it routes correctly
  const toolWithTicker = await inferSemanticToolWithClef('這個投資論點被證偽了嗎？', '2330')
  assert.equal(toolWithTicker, 'trackInvestmentSignal')
})

test('Clef System One ignores classifications with missing or non-numeric confidence', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({
      model: 'clef-flash',
      answers: {
        intent: {
          type: 'choice',
          choice: 'stock_chart'
          // confidence is omitted/undefined
        }
      }
    })
  })) as any

  const tool = await inferSemanticToolWithClef('查看走勢圖', '2330')
  assert.equal(tool, undefined, 'Must reject tool routing if confidence is undefined')
})

test('excludes Taiwan stock heatmap in both Chinese and English from showMarketHeatmap', () => {
  assert.equal(inferDeterministicTool('今天台股熱力圖'), undefined)
  assert.equal(inferDeterministicTool('請顯示台灣股市熱力圖'), undefined)
  assert.equal(inferDeterministicTool('Taiwan stock heatmap'), undefined)
  assert.equal(inferDeterministicTool('Show me the Taiwan market heatmap'), undefined)
  assert.equal(inferDeterministicTool('heatmap of taiwan stocks'), undefined)
  // General or US heatmap should still route to showMarketHeatmap
  assert.equal(inferDeterministicTool('顯示美股市場熱力圖'), 'showMarketHeatmap')
  assert.equal(inferDeterministicTool('show market heatmap'), 'showMarketHeatmap')
})

test('routes Taiwan and general market overview queries to showMarketOverview', () => {
  assert.equal(inferDeterministicTool('今天台股表現如何？市場概況總覽'), 'showMarketOverview')
  assert.equal(inferDeterministicTool('大盤概況'), 'showMarketOverview')
  assert.equal(inferDeterministicTool('Taiwan market overview'), 'showMarketOverview')
  assert.equal(inferDeterministicTool('TAIEX market overview'), 'showMarketOverview')
})

test('Clef System One total failure gracefully falls back to undefined without throwing', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async () => {
    throw new Error('All decision models down')
  }) as any

  const tool = await inferSemanticToolWithClef('外資最近在倒貨嗎？', '2330')
  assert.equal(tool, undefined, 'Must safely return undefined when decision models fail')
})

