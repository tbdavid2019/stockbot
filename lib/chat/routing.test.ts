import test from 'node:test'
import assert from 'node:assert/strict'
import { inferDeterministicTool } from './routing.ts'

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
