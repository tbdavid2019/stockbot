import test from 'node:test'
import assert from 'node:assert/strict'
import {
  lookupTaiwanCompany,
  formatTaiwanCapital
} from './taiwan-company-network.ts'

test('formatTaiwanCapital formats currency into readable units', () => {
  assert.equal(formatTaiwanCapital(280_500_000_000), '2,805 億元')
  assert.equal(formatTaiwanCapital(8_000_000_000), '80 億元')
  assert.equal(formatTaiwanCapital(50_000_000), '5,000 萬元')
  assert.equal(formatTaiwanCapital(0), '未公開')
})

test('lookupTaiwanCompany finds TSMC (2330) by stock ticker', async () => {
  const tsmc = await lookupTaiwanCompany('2330')
  assert.ok(tsmc, 'Should find TSMC by ticker')
  assert.equal(tsmc.name, '台灣積體電路製造股份有限公司')
  assert.equal(tsmc.id, '22099131')
  assert.equal(tsmc.stockCode, '2330')
  assert.equal(tsmc.market, 'TWSE')
  assert.ok(tsmc.capital > 200_000_000_000, 'Capital should exceed 200 billion')
  assert.ok(tsmc.webUrl.includes('taiwan-company-network.david888.com/graph'))

  // Check downstream relationships
  const downstreamNames = tsmc.relationships.downstream.map(d => d.name)
  assert.ok(downstreamNames.includes('創意電子股份有限公司'), 'Downstream should include 創意電子')
  assert.ok(downstreamNames.includes('精材科技股份有限公司'), 'Downstream should include 精材科技')

  // Check that listed affiliate got stock code resolved
  const alchip = tsmc.relationships.downstream.find(d => d.name === '創意電子股份有限公司')
  assert.ok(alchip, '創意電子 should be present')
  assert.equal(alchip?.stockCode, '3443')
  assert.equal(alchip?.market, 'TWSE')
})

test('lookupTaiwanCompany finds Foxconn (2317) by short name 鴻海', async () => {
  const foxconn = await lookupTaiwanCompany('鴻海')
  assert.ok(foxconn, 'Should find Foxconn by short name')
  assert.equal(foxconn.name, '鴻海精密工業股份有限公司')
  assert.equal(foxconn.stockCode, '2317')
  assert.equal(foxconn.market, 'TWSE')
  assert.ok(foxconn.relationships.downstream.length > 5, 'Should have multiple downstream entities')

  // Check 鴻華先進 stock code resolution
  const foxtron = foxconn.relationships.downstream.find(d => d.name === '鴻華先進科技股份有限公司')
  assert.ok(foxtron, '鴻華先進 should be present')
  assert.equal(foxtron?.stockCode, '2258')
})

test('lookupTaiwanCompany handles .TW suffix properly', async () => {
  const mediatek = await lookupTaiwanCompany('2454.TW')
  assert.ok(mediatek, 'Should find MediaTek with .TW suffix')
  assert.equal(mediatek.name, '聯發科技股份有限公司')
  assert.equal(mediatek.stockCode, '2454')
})
