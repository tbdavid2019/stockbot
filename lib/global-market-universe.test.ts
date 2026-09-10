import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeHkexRows,
  normalizeJpxRows,
  normalizeNasdaqText,
  normalizeEuronextRows,
  normalizeEuronextCsv,
  normalizeLseCsv,
  normalizeSseSuggestionText,
  normalizeSzseRows,
  resolveGlobalSecurity
} from './global-market-universe.ts'

test('normalizes official global directory formats into one security schema', () => {
  const securities = [
    ...normalizeNasdaqText(
      [
        'Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares|File Creation Time|',
        'AAPL|Apple Inc. - Common Stock|Q|N|N|100|N|N||',
        'File Creation Time: 09102026|'
      ].join('\n')
    ),
    ...normalizeHkexRows([
      [
        'Stock Code',
        'Name of Securities',
        'Category',
        'Sub-Category',
        'Board Lot',
        'ISIN'
      ],
      [
        '00700',
        'TENCENT HOLDINGS',
        'Equity',
        'Equity Securities (Main Board)',
        '100',
        'KYG875721634'
      ]
    ]),
    ...normalizeJpxRows([
      ['日付', 'コード', '銘柄名', '市場・商品区分'],
      ['20260831', '7203', 'トヨタ自動車', 'プライム（内国株式）']
    ]),
    ...normalizeSseSuggestionText(
      'function get_alldata(){_t.push({val:"600519",val2:"贵州茅台",val3:"gzmt"});}'
    ),
    ...normalizeSzseRows([
      ['板块', 'A股代码', 'A股简称', 'A股上市日期'],
      ['创业板', '300750', '宁德时代', '2018-06-11']
    ]),
    ...normalizeEuronextRows({
      aaData: [['<a>ADYEN</a>', 'NL0012969182', 'ADYEN', '<div>XAMS</div>']]
    })
  ]

  assert.equal(
    securities.find(item => item.canonicalTicker === 'NASDAQ:AAPL')
      ?.yahooTicker,
    'AAPL'
  )
  assert.equal(
    securities.find(item => item.canonicalTicker === 'HKEX:00700')?.yahooTicker,
    '0700.HK'
  )
  assert.equal(
    securities.find(item => item.canonicalTicker === 'JPX:7203')?.yahooTicker,
    '7203.T'
  )
  assert.equal(
    securities.find(item => item.canonicalTicker === 'SSE:600519')?.yahooTicker,
    '600519.SS'
  )
  assert.equal(
    securities.find(item => item.canonicalTicker === 'SZSE:300750')
      ?.yahooTicker,
    '300750.SZ'
  )
  assert.equal(
    securities.find(item => item.canonicalTicker === 'EURONEXT:ADYEN')
      ?.yahooTicker,
    'ADYEN.AS'
  )
  assert.equal(
    normalizeEuronextCsv(
      [
        '"European Equities"',
        '"10 Sep 2026"',
        'Name;ISIN;Symbol;Market',
        'ADYEN;NL0012969182;ADYEN;Euronext Amsterdam'
      ].join('\n')
    )[0]?.yahooTicker,
    'ADYEN.AS'
  )
  assert.equal(
    normalizeLseCsv(
      [
        'TIDM,Instrument Name,ISIN,Market',
        'BARC,BARCLAYS PLC,GB0031348658,MAIN MARKET'
      ].join('\n')
    )[0]?.canonicalTicker,
    'LSE:BARC'
  )
})

test('resolves a natural-language question through the official registry', () => {
  const universe = normalizeHkexRows([
    [
      'Stock Code',
      'Name of Securities',
      'Category',
      'Sub-Category',
      'Board Lot',
      'ISIN'
    ],
    [
      '01810',
      'XIAOMI-W',
      'Equity',
      'Equity Securities (Main Board)',
      '200',
      'KYG9830T1067'
    ]
  ])

  const result = resolveGlobalSecurity(
    '小米集團 1810.HK 是做什麼的公司？',
    universe
  )

  assert.equal(result.status, 'resolved')
  assert.equal(result.security?.canonicalTicker, 'HKEX:01810')
  assert.equal(result.security?.yahooTicker, '1810.HK')
})
