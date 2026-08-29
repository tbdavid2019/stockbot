## 1. Quantitative Core Engine (`lib/quant/`)

- [x] 1.1 Implement DCF, CAPM/WACC computation, peer multiples triangulation, and 5×5 sensitivity matrix in `lib/quant/valuation.ts` and verify against sample ticker financials.
- [x] 1.2 Implement Minervini SEPA 8-point Trend Template checks, 4-Stage classification, VCP pattern evaluation, and position sizing in `lib/quant/sepa.ts` and verify on historical OHLCV data.
- [x] 1.3 Implement Black-Scholes formula, multi-leg options payoff generator, and Greeks in `lib/quant/black-scholes.ts` and verify against benchmark options pricing models.
- [x] 1.4 Implement Amihud illiquidity, float turnover, Square-root market impact ($\sigma \sqrt{Q/V}$), and ETF NAV divergence in `lib/quant/microstructure.ts` and verify calculations.

## 2. Data Integration & Tool Orchestration

- [x] 2.1 Extend `lib/financial-fundamentals.ts` to retrieve upcoming earnings dates, consensus EPS/revenue estimates, and historical 4-quarter surprises.
- [x] 2.2 Register new tools (`calculateCompanyValuation`, `analyzeSepaStrategy`, `previewEarnings`, `simulateOptionsPayoff`, `analyzeEtfPremium`, `analyzeStockLiquidity`) in `lib/chat/actions.tsx` with proper error handling.
- [x] 2.3 Update deterministic routing rules in `lib/chat/routing.ts` to identify valuation, SEPA momentum, earnings preview, and derivatives/liquidity intents.

## 3. Financial UI Cards & Interactive Simulators

- [x] 3.1 Build `<CompanyValuationCard />` in `components/stocks/company-valuation-card.tsx` with fair value badge, DCF bridge, and 5×5 sensitivity matrix.
- [x] 3.2 Build `<SepaStrategyCard />` in `components/stocks/sepa-strategy-card.tsx` with 8-condition scorecard, Stage badge, buy zone indicator, and position sizing calculator.
- [x] 3.3 Build `<EarningsBriefingCard />` in `components/stocks/earnings-briefing-card.tsx` with consensus range display, analyst price target spread, and 4-quarter beat/miss tracker.
- [x] 3.4 Build `<OptionsPayoffCard />` in `components/stocks/options-payoff-card.tsx` with interactive sliders (Strike, DTE, IV, Spot) and theoretical vs expiry payoff curves.
- [x] 3.5 Build `<StockLiquidityCard />` and `<EtfPremiumCard />` in `components/stocks/` with market impact slippage curves and ETF NAV divergence indicators.

## 4. End-to-End Testing & Documentation

- [x] 4.1 Verify TypeScript type safety (`pnpm build` or `tsc --noEmit`) and ensure all new cards render ABOVE the accompanying text caption without breaking `localStorage` serialization.
- [x] 4.2 Update `CHANGELOG.md`, `README.md`, and `AGENTS.md` documenting the new quantitative features.
