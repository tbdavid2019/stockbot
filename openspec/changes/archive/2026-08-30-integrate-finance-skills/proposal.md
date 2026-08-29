## Why

Stockbot currently excels at multi-provider LLM conversational flow, 13-master qualitative assessment, real-time quotes, and 2MD web research. However, it lacks deep quantitative valuation models (DCF, WACC, sensitivity grids), systematic momentum screening (Minervini SEPA trend templates & VCP patterns), structured pre-earnings briefings with consensus tracking, and interactive derivatives/microstructure analytics (Options payoff curves, ETF NAV premium/GEX, and market impact estimation).

Integrating the core analytical frameworks from `himself65/finance-skills` natively into Stockbot's TypeScript engine will bridge this gap, elevating Stockbot into an institutional-grade quantitative and fundamental financial AI platform without requiring additional external API costs or server-side Python dependencies.

## What Changes

- **Company Intrinsic Valuation Engine & UI (`valuation-analysis`)**:
  - Add native DCF valuation modeling with 5-year FCFF projection, live 10-year Treasury yield (`^TNX`) risk-free rate, beta adjustments, and WACC computation.
  - Add peer-multiple relative valuation (P/E, EV/EBITDA, EV/Sales) and a 5×5 WACC × terminal growth rate ($g$) sensitivity matrix.
  - Deliver native `<CompanyValuationCard />` rendered above the accompanying explanation.

- **Minervini SEPA Growth Momentum Framework (`sepa-momentum`)**:
  - Implement the 8-condition Trend Template checklist (MA stacking: Price > 50MA > 150MA > 200MA, 200MA slope, 52-week high/low proximity, RS rating).
  - Implement 4-Stage cycle classification (Stage 1 Basing, Stage 2 Advancing, Stage 3 Topping, Stage 4 Declining) and fundamental EPS/revenue acceleration screening.
  - Implement pivot point breakout $+5\%$ buy zone calculation and risk-based position sizing calculator.
  - Deliver native `<SepaStrategyCard />`.

- **Pre- & Post-Earnings Briefing Intelligence (`earnings-intelligence`)**:
  - Implement structured pre-earnings briefs: consensus EPS/revenue estimates (avg, low, high, analyst count), historical beat/miss track record across the last 4 quarters, and analyst price target distributions.
  - Deliver native `<EarningsBriefingCard />`.

- **Derivatives, Liquidity & ETF Microstructure (`derivatives-microstructure`)**:
  - Implement interactive multi-leg options payoff curve simulator (Black-Scholes model for butterfly, vertical spreads, iron condors, straddles, covered calls) with dynamic sliders (`<OptionsPayoffCard />`).
  - Implement ETF premium/discount vs NAV calculator and options dealer Gamma Exposure (GEX) decomposition (`<EtfPremiumCard />`).
  - Implement stock liquidity dashboard with Amihud illiquidity ratio, float turnover, and Square-root Market Impact ($\sigma \sqrt{Q/V}$) slippage estimator (`<StockLiquidityCard />`).

- **Deterministic Routing & Tool Integrations**:
  - Extend `lib/chat/routing.ts` and `lib/chat/actions.tsx` to deterministically dispatch user intents (e.g. "合理價", "DCF", "SEPA", "趨勢模板", "財報前瞻", "選擇權損益", "ETF溢價", "流動性衝擊") to the corresponding specialized cards.

## Capabilities

### New Capabilities
- `valuation-analysis`: Comprehensive intrinsic DCF modeling, WACC calculation, peer multiple triangulation, and 5×5 sensitivity matrix with `<CompanyValuationCard />`.
- `sepa-momentum`: Minervini SEPA Stage 2 analysis, 8-condition trend template scorecard, VCP pattern detection, and risk-adjusted position sizing with `<SepaStrategyCard />`.
- `earnings-intelligence`: Pre-earnings briefing, consensus estimate spread, historical beat/miss tracking, and analyst sentiment with `<EarningsBriefingCard />`.
- `derivatives-microstructure`: Interactive options payoff curve simulation, ETF NAV premium/discount with dealer GEX analysis, and liquidity market impact estimation.

### Modified Capabilities
<!-- None: existing tools continue to function without breaking contract changes -->

## Impact

- **TypeScript Engine**: New computation modules in `lib/quant/` for DCF/WACC, SEPA technical checks, Black-Scholes options pricing, Amihud/Slippage calculation, and ETF NAV parsing.
- **Data Integration**: Extends `lib/financial-fundamentals.ts` to supply earnings calendar, historical surprise metrics, and option chain metadata.
- **Routing & Orchestration**: Updates `lib/chat/routing.ts` and `lib/chat/actions.tsx` to support new tool declarations (`calculateCompanyValuation`, `analyzeSepaStrategy`, `previewEarnings`, `simulateOptionsPayoff`, `analyzeEtfPremium`, `analyzeStockLiquidity`).
- **UI Components**: Introduces 6 new native financial cards in `components/stocks/` following the existing `BotCard` above-text rendering policy and dark/light UI design system.
- **Dependencies**: No external Python runtime required; uses native JavaScript/TypeScript math and standard `@ai-sdk/openai` server streaming.
