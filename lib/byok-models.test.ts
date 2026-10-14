import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchByokModels } from './byok-models.ts'

test('uses authenticated live model lists without redirects or caching', async () => {
  const models = await fetchByokModels('https://api.openai.com/v1', 'test-secret', async (url, init) => {
    assert.equal(String(url), 'https://api.openai.com/v1/models')
    assert.equal(init?.redirect, 'error')
    assert.equal(init?.cache, 'no-store')
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-secret')
    return Response.json({ data: [{ id: 'new-chat' }, { id: 'retired', active: false }, { id: 'new-chat' }] })
  })
  assert.deepEqual(models, [{ id: 'new-chat', name: 'new-chat' }])
})

test('Gemini paginates native models and filters unsupported generation methods', async () => {
  let calls = 0
  const models = await fetchByokModels('https://generativelanguage.googleapis.com/v1beta/openai/', 'test-secret', async (url, init) => {
    assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-secret')
    assert.equal(new Headers(init?.headers).has('Authorization'), false)
    calls++
    if (calls === 1) return Response.json({ models: [
      { name: 'models/new-flash', displayName: 'New Flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/embedding', supportedGenerationMethods: ['embedContent'] }
    ], nextPageToken: 'next page' })
    assert.equal(new URL(String(url)).searchParams.get('pageToken'), 'next page')
    return Response.json({ models: [{ name: 'models/new-pro', supportedGenerationMethods: ['generateContent'] }] })
  })
  assert.deepEqual(models.map(m => m.id), ['new-flash', 'new-pro'])
})

test('rejects unsafe endpoints before forwarding the key', async () => {
  await assert.rejects(fetchByokModels('https://127.0.0.1/v1', 'test-secret', async () => {
    assert.fail('private endpoint must not receive a key')
  }))
})

test('provider errors never return credential-bearing upstream text', async () => {
  await assert.rejects(fetchByokModels('https://api.openai.com/v1', 'test-secret', async () =>
    new Response('test-secret internal details', { status: 401 })
  ), (error: any) => error.status === 401 && !error.message.includes('test-secret'))
})

test('malformed or empty model lists fail rather than inventing a default', async () => {
  for (const body of [{}, { data: [] }]) {
    await assert.rejects(fetchByokModels('https://api.openai.com/v1', 'test-secret', async () => Response.json(body)))
  }
})
