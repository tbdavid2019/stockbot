/**
 * us_fddk integration - voidful/us_fddk 20-Year Asset Allocation & Factor Lab Adapter
 * Provides 20-year audited factor regimes, ETF benchmarks, and live forward paper tracking.
 */

export interface FactorBaseline {
  key: string
  label: string
  detail: string
  role: string
  weights: Record<string, number>
  cagr: number
  sharpe: number
  sortino: number
  maxDrawdown: number
  calmar: number
  volatility: number
  betaToSpy: number
  downCaptureVsSpy: number
}

export interface MacroFactorRegimeResult {
  title: string
  summary: string
  asOfDate: string
  activeStrategy: {
    name: string
    targetWeights: Record<string, number>
    cagr: number
    sharpe: number
    maxDrawdown: number
  }
  baselines: FactorBaseline[]
  institutionalInsights: string
}

const US_FDDK_SITE_DATA_URL =
  'https://raw.githubusercontent.com/voidful/us_fddk/main/artifacts/site_data.json'
const US_FDDK_EXPANDED_URL =
  'https://raw.githubusercontent.com/voidful/us_fddk/main/artifacts/v25_expanded_comparison.json'

let cachedRegime: { timestamp: number; data: MacroFactorRegimeResult } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function fetchMacroFactorRegime(): Promise<MacroFactorRegimeResult> {
  const now = Date.now()
  if (cachedRegime && now - cachedRegime.timestamp < CACHE_TTL_MS) {
    return cachedRegime.data
  }

  try {
    const [siteRes, expandedRes] = await Promise.all([
      fetch(US_FDDK_SITE_DATA_URL, {
        headers: { Accept: 'application/json', 'User-Agent': 'stockbot-us-fddk/2.0' },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 3600 }
      }).catch(() => undefined),
      fetch(US_FDDK_EXPANDED_URL, {
        headers: { Accept: 'application/json', 'User-Agent': 'stockbot-us-fddk/2.0' },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 3600 }
      }).catch(() => undefined)
    ])

    const siteData = siteRes?.ok ? await siteRes.json() : null
    const expandedData = expandedRes?.ok ? await expandedRes.json() : null

    const formal = Array.isArray(expandedData?.formal_baselines)
      ? expandedData.formal_baselines
      : []

    const baselines: FactorBaseline[] = formal.map((b: any) => ({
      key: b.key || 'N/A',
      label: b.label || b.key,
      detail: b.detail || '',
      role: b.role || 'benchmark',
      weights: b.weights || {},
      cagr: Number(b.metrics?.cagr || 0),
      sharpe: Number(b.metrics?.sharpe || 0),
      sortino: Number(b.metrics?.sortino || 0),
      maxDrawdown: Number(b.metrics?.max_drawdown || 0),
      calmar: Number(b.metrics?.calmar || 0),
      volatility: Number(b.metrics?.volatility || 0),
      betaToSpy: Number(b.beta_to_spy || 1.0),
      downCaptureVsSpy: Number(b.down_capture_vs_spy || 1.0)
    }))

    // Fallback baseline defaults if expandedData fetch is empty
    if (baselines.length === 0) {
      baselines.push(
        {
          key: 'SPY',
          label: 'SPY',
          detail: 'S&P 500 大盤基準',
          role: 'market_benchmark',
          weights: { SPY: 1.0 },
          cagr: 0.1127,
          sharpe: 0.65,
          sortino: 1.06,
          maxDrawdown: -0.5519,
          calmar: 0.22,
          volatility: 0.1943,
          betaToSpy: 1.0,
          downCaptureVsSpy: 1.0
        },
        {
          key: 'QQQ',
          label: 'QQQ',
          detail: 'Nasdaq-100 科技大型成長股',
          role: 'growth_style',
          weights: { QQQ: 1.0 },
          cagr: 0.1668,
          sharpe: 0.81,
          sortino: 1.36,
          maxDrawdown: -0.534,
          calmar: 0.33,
          volatility: 0.2209,
          betaToSpy: 1.11,
          downCaptureVsSpy: 1.02
        },
        {
          key: '60_SPY_40_IEF',
          label: '60% SPY / 40% IEF',
          detail: '經典股債平衡配置',
          role: 'balanced_allocation',
          weights: { SPY: 0.6, IEF: 0.4 },
          cagr: 0.0836,
          sharpe: 0.90,
          sortino: 1.18,
          maxDrawdown: -0.2949,
          calmar: 0.28,
          volatility: 0.0935,
          betaToSpy: 0.59,
          downCaptureVsSpy: 0.55
        },
        {
          key: '80_VUG_20_SHY',
          label: '80% VUG / 20% SHY',
          detail: '成長風格 + 短債風險防守',
          role: 'exposure_control',
          weights: { VUG: 0.8, SHY: 0.2 },
          cagr: 0.1118,
          sharpe: 0.84,
          sortino: 1.21,
          maxDrawdown: -0.3854,
          calmar: 0.29,
          volatility: 0.1373,
          betaToSpy: 0.86,
          downCaptureVsSpy: 0.82
        }
      )
    }

    const strat = siteData?.strategy
    const activeStrategy = {
      name: strat?.name || '成長守門員 v2（波幅管理動態權重）',
      targetWeights: strat?.current_target || { QQQ: 0.755, SHY: 0.245 },
      cagr: Number(strat?.metrics?.cagr || 0.1561),
      sharpe: Number(strat?.metrics?.sharpe || 0.9395),
      maxDrawdown: Number(strat?.metrics?.max_drawdown || -0.3596)
    }

    const result: MacroFactorRegimeResult = {
      title: '美股 20 年多因子風格輪動與資產配置研究',
      summary: '基於 voidful/us_fddk 20 年可稽核歷史凍結數據與 Fama-French 多因子模型，提供包含扣除 10/50 bps 滑價成本之跨資產 ETF 策略回測與 LIVE Paper 實績對照。',
      asOfDate: siteData?.data_through || new Date().toISOString().slice(0, 10),
      activeStrategy,
      baselines,
      institutionalInsights: '實證數據顯示：純持有 QQQ 雖具備最高 20 年 CAGR (16.6%)，但最大回撤達 -53.4%；若採用「80% 成長 ETF (VUG/QQQ) + 20% 短債 (SHY)」或動態波動率管理，能在保留 85% 以上年化報酬的同時，將最大回撤顯著壓縮至 -35% 區間，大幅提升夏普比率 (0.94 vs 0.65)。'
    }

    cachedRegime = { timestamp: now, data: result }
    return result
  } catch (err) {
    console.warn('[us_fddk] Failed to fetch macro factor regime:', err)
  }

  return {
    title: '美股 20 年多因子風格輪動與資產配置研究',
    summary: '美股跨資產 20 年可稽核量化因子基準分析。',
    asOfDate: new Date().toISOString().slice(0, 10),
    activeStrategy: {
      name: '成長守門員 v2（波幅管理）',
      targetWeights: { QQQ: 0.755, SHY: 0.245 },
      cagr: 0.1561,
      sharpe: 0.94,
      maxDrawdown: -0.3596
    },
    baselines: [],
    institutionalInsights: '建議採取核心大盤 (SPY/QQQ) 搭配防守性資產 (SHY/IEF) 的動態配置策略。'
  }
}
