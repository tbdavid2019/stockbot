import test from 'node:test'
import assert from 'node:assert/strict'
import {
  fetchEarningsCalls,
  computeConferenceStatus,
  formatDualTimezone,
  parseZonedTimeToUtc
} from './earnings-call.ts'

test('computeConferenceStatus accurately identifies upcoming and replays', () => {
  const status1 = computeConferenceStatus('2026-10-15', 'Asia/Taipei', '14:00', new Date('2026-10-14T00:00:00Z'))
  assert.equal(status1, 'upcoming')

  const status2 = computeConferenceStatus('2026-10-01', 'Asia/Taipei', '14:00', new Date('2026-10-14T00:00:00Z'))
  assert.equal(status2, 'replay')
})

test('formatDualTimezone converts US ET conference to Taipei local time', () => {
  const dual = formatDualTimezone('2026-10-14', '08:30', 'America/New_York', 'Asia/Taipei')
  assert.equal(dual.marketDate, '2026-10-14')
  assert.equal(dual.marketTime, '08:30')
  assert.equal(dual.localTzName, '台北時間 (CST)')
  // 08:30 ET is 20:30 CST on the same day
  assert.equal(dual.localTime, '20:30')
  assert.equal(dual.isCrossDay, false)
})

test('formatDualTimezone converts Tokyo JST and Seoul KST to Taipei local time', () => {
  // 10:00 JST / KST is 09:00 CST (Taipei)
  const dualJp = formatDualTimezone('2026-10-14', '10:00', 'Asia/Tokyo', 'Asia/Taipei')
  assert.equal(dualJp.marketDate, '2026-10-14')
  assert.equal(dualJp.marketTzName, '東京時區 (JST)')
  assert.equal(dualJp.localTime, '09:00')

  const dualKr = formatDualTimezone('2026-10-14', '10:00', 'Asia/Seoul', 'Asia/Taipei')
  assert.equal(dualKr.marketDate, '2026-10-14')
  assert.equal(dualKr.marketTzName, '首爾時區 (KST)')
  assert.equal(dualKr.localTime, '09:00')
})

test('fetchEarningsCalls successfully retrieves enriched BigGo earnings calls for 2330 (TSMC)', async () => {
  const result = await fetchEarningsCalls({ symbol: '2330' })
  assert.ok(result.totalCount > 0, 'Should find earnings calls for 2330')
  assert.equal(result.symbol, '2330')
  assert.ok(result.source.includes('BigGo Finance'))

  const topCall = result.all[0]
  assert.ok(topCall, 'Top call should exist')
  assert.equal(topCall.symbol, '2330')
  assert.ok(topCall.companyName.includes('台積') || topCall.companyName.includes('TSMC'))
  assert.ok(topCall.irUrl?.includes('tsmc.com') || topCall.irUrl?.includes('biggo.com.tw'))
})

test('fetchEarningsCalls successfully retrieves SpaceX (SPCX) NASDAQ earnings calls', async () => {
  const result = await fetchEarningsCalls({ symbol: 'SPCX' })
  assert.ok(result.totalCount > 0, 'Should find earnings calls for SPCX')
  assert.equal(result.symbol, 'SPCX')

  const spcxCall = result.all.find(c => c.symbol === 'SPCX')
  assert.ok(spcxCall, 'SPCX earnings call must be present')
  assert.equal(spcxCall.market, 'US')
})

test('fetchEarningsCalls successfully retrieves Japan market (JPX) earnings calls', async () => {
  const result = await fetchEarningsCalls({ market: 'JP', limit: 50 })
  assert.ok(result.totalCount > 0, 'Should find earnings calls for Japan market')
  assert.equal(result.marketFilter, 'JP')

  const jpCalls = result.all.filter(c => c.market === 'JP')
  assert.ok(jpCalls.length > 0, 'All calls should be JP market')
  assert.equal(jpCalls[0].timezone, 'Asia/Tokyo')
})

test('fetchEarningsCalls successfully retrieves Korean market (KRX) earnings calls', async () => {
  const result = await fetchEarningsCalls({ symbol: '005930' })
  assert.ok(result.totalCount > 0, 'Should find earnings calls for Samsung (005930)')

  const krCall = result.all[0]
  assert.ok(krCall, 'Korea call should exist')
  assert.equal(krCall.market, 'KR')
  assert.equal(krCall.timezone, 'Asia/Seoul')
})

test('fetchEarningsCalls retrieves multi-window dashboard with abundant calls across global markets', async () => {
  const result = await fetchEarningsCalls({ market: 'ALL', limit: 150 })
  assert.ok(result.totalCount >= 50, `Expected at least 50 calls in dashboard, got ${result.totalCount}`)
  assert.ok(result.all.length > 0)
  assert.ok(result.source.includes('BigGo Finance'))

  // Verify presence of TW, US, and JP calls
  const twCalls = result.all.filter(c => c.market === 'TWSE' || c.market === 'TPEX')
  const usCalls = result.all.filter(c => c.market === 'US')
  const jpCalls = result.all.filter(c => c.market === 'JP')

  assert.ok(twCalls.length > 0, 'Dashboard should include Taiwan calls')
  assert.ok(usCalls.length > 0, 'Dashboard should include US calls')
  assert.ok(jpCalls.length > 0, 'Dashboard should include Japan calls')
})
