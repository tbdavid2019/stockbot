import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTpExRows,
  normalizeTwseRows,
  resolveMarketSecurity
} from './market-universe.ts'

test('normalizes official TWSE and TPEx rows into one canonical Taiwan market universe', () => {
  const securities = [
    ...normalizeTwseRows([
      {
        公司代號: '1476',
        公司名稱: '儒鴻企業股份有限公司',
        公司簡稱: '儒鴻',
        英文簡稱: 'ECLAT',
        出表日期: '1150910'
      }
    ]),
    ...normalizeTpExRows([
      {
        SecuritiesCompanyCode: '6488',
        CompanyName: '環球晶圓股份有限公司',
        CompanyAbbreviation: '環球晶',
        Symbol: 'GlobalWafers'
      }
    ])
  ]

  assert.deepEqual(
    securities.map(item => item.canonicalTicker),
    ['TWSE:1476', 'TPEX:6488']
  )
  assert.equal(securities[0].yahooTicker, '1476.TW')
  assert.equal(securities[0].exchange, 'TWSE')
  assert.equal(securities[0].name, '儒鴻')
  assert.equal(securities[1].name, '環球晶')
})

test('resolves a company embedded in a natural-language question without a hand-written alias', () => {
  const universe = normalizeTwseRows([
    {
      公司代號: '1476',
      公司名稱: '儒鴻企業股份有限公司',
      公司簡稱: '儒鴻',
      英文簡稱: 'ECLAT'
    }
  ])

  const result = resolveMarketSecurity('儒鴻是做什麼的公司？', universe)

  assert.equal(result.status, 'resolved')
  assert.equal(result.security?.canonicalTicker, 'TWSE:1476')
  assert.equal(result.security?.name, '儒鴻')
})

test('does not silently select when a name maps to more than one security', () => {
  const universe = normalizeTwseRows([
    { 公司代號: '1001', 公司名稱: '同名股份有限公司', 公司簡稱: '同名' },
    { 公司代號: '1002', 公司名稱: '同名科技股份有限公司', 公司簡稱: '同名' }
  ])

  const result = resolveMarketSecurity('同名最近如何？', universe)

  assert.equal(result.status, 'ambiguous')
  assert.equal(result.candidates.length, 2)
})
