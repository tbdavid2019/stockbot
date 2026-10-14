import test from 'node:test'
import assert from 'node:assert/strict'
import { PROVIDER_PRESETS, getStoredApiKeyConfig, detectProviderFromKey } from './hooks/use-user-api-key.ts'

test('Gemini defaults to the rolling latest alias; other providers require selection', () => {
  assert.equal(PROVIDER_PRESETS.gemini.defaultModel, 'gemini-flash-latest')
  assert.equal(PROVIDER_PRESETS.gemini.defaultToolModel, 'gemini-flash-latest')
  for (const provider of ['openai', 'groq', 'deepseek', 'custom'] as const) {
    assert.equal(PROVIDER_PRESETS[provider].defaultModel, '')
  }
  assert.equal(detectProviderFromKey('s', 'openai'), 'openai')
})

test('upgrades the previous Gemini preset and preserves explicit model or endpoint choices', t => {
  const original = globalThis.window
  t.after(() => { globalThis.window = original })
  for (const [model, baseURL, expected] of [
    ['gemini-2.5-flash', undefined, 'gemini-flash-latest'],
    ['user-pinned-model', undefined, 'user-pinned-model'],
    ['gemini-2.5-flash', 'https://example.com/v1', 'gemini-2.5-flash']
  ]) {
    globalThis.window = { localStorage: { getItem: () => JSON.stringify({ provider: 'gemini', apiKey: 'test-key', model, baseURL }) } } as any
    assert.equal(getStoredApiKeyConfig()?.model, expected)
  }
})
