import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findB2GEntity } from './tobid-entities.ts';
import { getCompanyProcurementIntelligence } from './tobid.ts';

test('B2G Entity Resolution correctly maps symbols, names, and aliases', () => {
  // Test symbol lookup
  const aidc = findB2GEntity('2634');
  assert.ok(aidc, '2634 should be resolved');
  assert.equal(aidc?.legalName, '漢翔航空工業股份有限公司');
  assert.equal(aidc?.sector, 'defense');

  // Test TW: prefix
  const syscom = findB2GEntity('TW:2453');
  assert.ok(syscom, 'TW:2453 should be resolved');
  assert.equal(syscom?.legalName, '凌群電腦股份有限公司');
  assert.equal(syscom?.sector, 'it_software');

  // Test name lookup
  const chungHsing = findB2GEntity('中興電');
  assert.ok(chungHsing, '中興電 should be resolved');
  assert.equal(chungHsing?.symbol, '1513');
  assert.equal(chungHsing?.legalName, '中興電工機械股份有限公司');

  // Test alias lookup
  const greenEnergy = findB2GEntity('雲豹能源');
  assert.ok(greenEnergy, '雲豹能源 should be resolved');
  assert.equal(greenEnergy?.symbol, '6869');
  assert.equal(greenEnergy?.sector, 'green_energy');

  // Test non-existent and broad category keywords that should NOT match a company
  assert.equal(findB2GEntity('999999'), null);
  assert.equal(findB2GEntity('環保標案'), null);
  assert.equal(findB2GEntity('綠能標案'), null);
  assert.equal(findB2GEntity('重大採購預告'), null);
});

test('ToBid MCP integration returns expected structure for 漢翔 (2634) with mocked payloads', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (url: any, init: any) => {
    const body = JSON.parse(init.body);
    if (body.method === 'initialize') {
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'tobid', version: '1.0' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (body.method === 'notifications/initialized') {
      return new Response('', { status: 202 });
    }
    if (body.method === 'tools/call') {
      if (body.params.name === 'vendor_report') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    name: '漢翔航空工業股份有限公司',
                    participations: 1756,
                    wins: 1469,
                    win_rate_pct: 83.7,
                    known_award_total: 246500000000,
                    sole_bid_rate_pct: 75.2,
                    top_clients: [{ unit: '國防部', wins: 800, amount: 150000000000 }],
                    top_rivals: [
                      {
                        name: '亞洲航空股份有限公司',
                        met: 97,
                        this_vendor_wins: 48,
                        rival_wins: 49,
                      },
                    ],
                  }),
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (body.params.name === 'vendor_compliance') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    name: '漢翔航空工業股份有限公司',
                    currently_debarred: false,
                    debarments: [],
                    revoked: [],
                    article_101_cases: [],
                  }),
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (body.params.name === 'search_tenders') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    results: [
                      {
                        title: '新式高教機後續維修支援採購案',
                        date: 20260315,
                        type: '決標公告',
                        unit_name: '空軍司令部',
                        award_amount: 5200000000,
                      },
                    ],
                  }),
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (body.params.name === 'procurement_forecast') {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    total: 12,
                    forecasts_in_database: 12,
                    items: [
                      {
                        title: '無人靶機航電升級案',
                        unit_name: '國家中山科學研究院',
                        budget: 850000000,
                        forecast_date: '2026-11',
                      },
                    ],
                  }),
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        error: { message: 'Not found' },
      }),
      { status: 404 }
    );
  }) as any;

  const result = await getCompanyProcurementIntelligence('2634');
  assert.ok(result, 'Result should not be null');
  assert.equal(result.company.legalName, '漢翔航空工業股份有限公司');
  assert.equal(result.isUnavailable, false, 'isUnavailable should be false');

  assert.ok(result.report, '漢翔 historical vendor_report should not be null');
  assert.equal(result.report.participations, 1756);
  assert.equal(result.report.wins, 1469);
  assert.equal(result.report.win_rate_pct, 83.7);
  assert.equal(result.report.known_award_total, 246500000000);
  assert.equal(result.report.top_clients[0].unit, '國防部');
  assert.equal(result.report.top_rivals[0].met, 97);

  assert.ok(result.compliance, '漢翔 vendor_compliance should not be null');
  assert.equal(result.compliance.currently_debarred, false);

  assert.equal(result.recentTenders.length, 1);
  assert.equal(result.recentTenders[0].title, '新式高教機後續維修支援採購案');

  assert.ok(result.forecasts);
  assert.equal(result.forecasts.items.length, 1);
});

test('Live ToBid MCP integration (opt-in via TEST_LIVE_TOBID=1)', { skip: process.env.TEST_LIVE_TOBID !== '1' }, async () => {
  const result = await getCompanyProcurementIntelligence('2634');
  assert.ok(result);
  assert.equal(result.company.legalName, '漢翔航空工業股份有限公司');
});
