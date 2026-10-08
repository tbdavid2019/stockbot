import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateSystemOne, _resetClefStateForTests } from './clef.ts'

const originalFetch = globalThis.fetch

function restoreFetch() {
  globalThis.fetch = originalFetch
}

test('Clef System One evaluates choice, score and noul in a single request', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async (url: string | URL | Request) => {
    return {
      ok: true,
      json: async () => ({
        model: 'clef-flash',
        answers: {
          sentiment: {
            type: 'choice',
            choice: 'positive',
            probabilities: { positive: 0.96, negative: 0.02, neutral: 0.02 },
            confidence: 0.94
          },
          bullish_probability: {
            type: 'noul',
            noul: 0.92
          },
          confidence_level: {
            type: 'score',
            score: 4,
            legend: { '1': '極低', '2': '偏低', '3': '中等', '4': '偏高', '5': '極高' },
            probabilities: { '4': 0.85, '5': 0.15 },
            confidence: 0.88
          }
        },
        usage: { input_tokens: 120, output_tokens: 0 }
      })
    } as any
  }) as any

  const res = await evaluateSystemOne({
    model: 'clef-flash',
    state: {
      company: '台積電',
      ticker: '2330.TW',
      recentNews: 'AI晶片需求激增，先進製程產能滿載，第四季展望樂觀。'
    },
    questions: {
      sentiment: {
        type: 'choice',
        instructions: '該資訊對公司前景的影響為何？',
        criteria: {
          positive: '正面利好成長',
          negative: '負面衝擊下修',
          neutral: '中性無影響'
        }
      },
      bullish_probability: {
        type: 'noul',
        instructions: '該消息是否偏向看多？'
      },
      confidence_level: {
        type: 'score',
        instructions: '對該判斷的信心水準（1到5級）：',
        criteria: ['極低', '偏低', '中等', '偏高', '極高']
      }
    }
  })

  assert.ok(res, 'Response should not be null')
  assert.equal(res?.model, 'clef-flash')

  const answers = res?.answers
  assert.ok(answers, 'Answers should exist')

  const sentiment = answers?.sentiment
  assert.equal(sentiment?.type, 'choice')
  if (sentiment?.type === 'choice') {
    assert.equal(sentiment.choice, 'positive')
    assert.equal(sentiment.confidence, 0.94)
  }

  const bullish = answers?.bullish_probability
  assert.equal(bullish?.type, 'noul')
  if (bullish?.type === 'noul') {
    assert.equal(bullish.noul, 0.92)
  }

  const score = answers?.confidence_level
  assert.equal(score?.type, 'score')
  if (score?.type === 'score') {
    assert.equal(score.score, 4)
  }
})

test('Clef System One uses in-memory cache for identical requests', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  let fetchCount = 0
  globalThis.fetch = (async () => {
    fetchCount++
    return {
      ok: true,
      json: async () => ({
        model: 'clef-flash',
        answers: {
          is_test: { type: 'noul', noul: 1.0 }
        }
      })
    } as any
  }) as any

  const request = {
    model: 'clef-flash',
    state: '快取測試查詢 123',
    questions: {
      is_test: {
        type: 'noul' as const,
        instructions: '這是否為一項測試？'
      }
    }
  }

  const res1 = await evaluateSystemOne(request)
  assert.equal(fetchCount, 1)
  assert.ok(res1)

  // Second call should hit memoryCache and NOT call fetch
  const res2 = await evaluateSystemOne(request)
  assert.equal(fetchCount, 1, 'Second request must hit cache without network fetch')
  assert.deepEqual(res1?.answers, res2?.answers)
})

test('Clef System One fails over to secondary endpoint when primary fails', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  const calledUrls: string[] = []
  globalThis.fetch = (async (url: string | URL) => {
    const urlStr = String(url)
    calledUrls.push(urlStr)
    if (urlStr.includes('create360')) {
      throw new Error('Primary network failure')
    }
    return {
      ok: true,
      json: async () => ({
        model: 'clef-flash',
        answers: {
          test: { type: 'noul', noul: 0.99 }
        }
      })
    } as any
  }) as any

  const res = await evaluateSystemOne(
    {
      state: 'Failover check',
      questions: { test: { type: 'noul' } }
    },
    { timeoutMs: 1200 }
  )

  assert.ok(res)
  assert.ok(calledUrls.length >= 2, 'Should have called primary and then fallback')
  assert.ok(calledUrls[0].includes('create360'))
  assert.ok(calledUrls[1].includes('aiurl.tw'))
})

test('Clef System One circuit breaker opens after consecutive failures', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  let totalCalls = 0
  globalThis.fetch = (async () => {
    totalCalls++
    throw new Error('Continuous outage')
  }) as any

  // Call 1: fails on all 3 endpoints (3 calls)
  const r1 = await evaluateSystemOne({ state: 'q1', questions: { t: { type: 'noul' } } })
  assert.equal(r1, null)
  assert.equal(totalCalls, 3)

  // Call 2: fails on all 3 endpoints (3 calls, reaches threshold 2)
  const r2 = await evaluateSystemOne({ state: 'q2', questions: { t: { type: 'noul' } } })
  assert.equal(r2, null)
  assert.equal(totalCalls, 6)

  // Call 3: circuits are open! Should immediately return null without calling fetch
  const r3 = await evaluateSystemOne({ state: 'q3', questions: { t: { type: 'noul' } } })
  assert.equal(r3, null)
  assert.equal(totalCalls, 6, 'Should not have made calls when circuit is open')
})
