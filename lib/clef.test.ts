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

test('Clef System One fails over through 4-tier chain to OpenAI Decisions', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  const calledUrls: string[] = []
  globalThis.fetch = (async (url: string | URL, init: any) => {
    const urlStr = String(url)
    calledUrls.push(urlStr)
    if (urlStr.includes('create360') || urlStr.includes('aiurl.tw') || urlStr.includes('typesafe')) {
      throw new Error('Endpoint outage: ' + urlStr)
    }

    if (urlStr.includes('openai.com')) {
      assert.equal(init?.headers?.Authorization, 'Bearer test-openai-key')
      return {
        ok: true,
        json: async () => ({
          model: 'gpt-6-luna',
          answers: [
            {
              name: 'sentiment',
              type: 'choice',
              choice: 'bullish',
              confidence: 0.95,
              probabilities: { bullish: 0.95, bearish: 0.05 }
            }
          ],
          usage: { input_tokens: 88, output_tokens: 0 }
        })
      } as any
    }

    throw new Error('Unknown url: ' + urlStr)
  }) as any

  const res = await evaluateSystemOne(
    {
      state: { ticker: '2330', query: '看多還是看空？' },
      questions: {
        sentiment: {
          type: 'choice',
          instructions: '判斷看多或看空',
          criteria: { bullish: '看多', bearish: '看空' }
        }
      }
    },
    {
      typesafeApiKey: 'test-typesafe-key',
      openAiApiKey: 'test-openai-key'
    }
  )

  assert.ok(res, 'Response should succeed via Fallback 4 (OpenAI Decisions)')
  assert.equal(res?.model, 'gpt-6-luna')
  assert.equal(res?.answers?.sentiment?.type, 'choice')
  if (res?.answers?.sentiment?.type === 'choice') {
    assert.equal(res.answers.sentiment.choice, 'bullish')
    assert.equal(res.answers.sentiment.confidence, 0.95)
  }
  assert.equal(calledUrls.length, 4, 'Should have tried primary, fallback2, jev, and openai')
})

test('OpenAI Decisions Adapter correctly transforms questions, input, and responses', async () => {
  const { formatOpenAiInput, mapSystemOneQuestionsToOpenAi, parseOpenAiDecisionsResponse } = await import('./clef.ts')

  // 1. Input formatting
  assert.equal(formatOpenAiInput('plain text'), 'plain text')
  assert.equal(formatOpenAiInput({ foo: 'bar' }), '{"foo":"bar"}')
  assert.equal(formatOpenAiInput(null), '')

  // 2. Question mapping
  const mapped = mapSystemOneQuestionsToOpenAi({
    intent: {
      type: 'choice',
      instructions: 'Choose tool',
      criteria: { chart: 'K線圖', news: '新聞' }
    },
    is_urgent: {
      type: 'noul',
      instructions: 'Urgent check'
    },
    risk_level: {
      type: 'score',
      instructions: 'Rate risk',
      criteria: ['低', '中', '高']
    }
  })

  assert.equal(mapped.length, 3)
  assert.deepEqual(mapped[0], {
    name: 'intent',
    type: 'choice',
    instructions: 'Choose tool',
    choices: [
      { value: 'chart', description: 'K線圖' },
      { value: 'news', description: '新聞' }
    ]
  })
  assert.deepEqual(mapped[1], {
    name: 'is_urgent',
    type: 'predicate',
    instructions: 'Urgent check'
  })
  assert.deepEqual(mapped[2], {
    name: 'risk_level',
    type: 'score',
    instructions: 'Rate risk',
    levels: ['低', '中', '高']
  })

  // 3. Response parsing
  const parsed = parseOpenAiDecisionsResponse(
    {
      model: 'gpt-6-luna',
      answers: [
        {
          name: 'intent',
          type: 'choice',
          choice: 'chart',
          confidence: 0.92,
          probabilities: { chart: 0.92, news: 0.08 }
        },
        {
          name: 'is_urgent',
          type: 'predicate',
          probability: 0.85
        },
        {
          name: 'risk_level',
          type: 'score',
          score: 2.1,
          confidence: 0.88,
          probabilities: { '1': 0.1, '2': 0.8, '3': 0.1 }
        }
      ],
      usage: { input_tokens: 150, output_tokens: 0 }
    },
    {
      intent: { type: 'choice', criteria: { chart: 'K線圖', news: '新聞' } },
      is_urgent: { type: 'noul' },
      risk_level: { type: 'score', criteria: ['低', '中', '高'] }
    }
  )

  assert.ok(parsed)
  assert.equal(parsed?.answers?.intent?.type, 'choice')
  if (parsed?.answers?.intent?.type === 'choice') {
    assert.equal(parsed.answers.intent.choice, 'chart')
    assert.equal(parsed.answers.intent.confidence, 0.92)
  }

  assert.equal(parsed?.answers?.is_urgent?.type, 'noul')
  if (parsed?.answers?.is_urgent?.type === 'noul') {
    assert.equal(parsed.answers.is_urgent.noul, 0.85)
  }

  assert.equal(parsed?.answers?.risk_level?.type, 'score')
  if (parsed?.answers?.risk_level?.type === 'score') {
    assert.equal(parsed.answers.risk_level.score, 2.1)
  }
})

test('Clef System One circuit breaker opens after consecutive failures', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  let totalCalls = 0
  globalThis.fetch = (async () => {
    totalCalls++
    throw new Error('Continuous outage')
  }) as any

  // Call 1: fails on active endpoints (2 calls by default without keys)
  const r1 = await evaluateSystemOne({ state: 'q1', questions: { t: { type: 'noul' } } })
  assert.equal(r1, null)
  assert.equal(totalCalls, 2)

  // Call 2: fails on active endpoints (2 calls, reaches threshold 2)
  const r2 = await evaluateSystemOne({ state: 'q2', questions: { t: { type: 'noul' } } })
  assert.equal(r2, null)
  assert.equal(totalCalls, 4)

  // Call 3: circuits are open! Should immediately return null without calling fetch
  const r3 = await evaluateSystemOne({ state: 'q3', questions: { t: { type: 'noul' } } })
  assert.equal(r3, null)
  assert.equal(totalCalls, 4, 'Should not have made calls when circuit is open')
})

test('Clef System One total failure guarantees safe null fallback without throwing', async (t) => {
  _resetClefStateForTests()
  t.after(restoreFetch)

  globalThis.fetch = (async () => {
    throw new TypeError('Failed to fetch (DNS / Network down)')
  }) as any

  // Must not throw exception
  const result = await evaluateSystemOne(
    {
      state: 'all-failed',
      questions: { q: { type: 'noul' } }
    },
    {
      typesafeApiKey: 'key1',
      openAiApiKey: 'key2'
    }
  )

  assert.equal(result, null, 'Must safely return null when all decision models fail')
})
