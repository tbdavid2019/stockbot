## Context

Stockbot is a Next.js 14 App Router application deployed on serverless infrastructure (Vercel) using AI SDK RSC (`streamUI` & Server Actions) with a 60-second `maxDuration` budget. All financial cards render above the generated AI explanation text.

See `proposal.md` for background motivation and `specs/` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Implement institutional-grade quantitative formulas (DCF/WACC, Minervini SEPA 8-point checklist, Black-Scholes options pricing, ETF NAV premium/GEX, Amihud illiquidity & Square-root market impact) entirely in **pure TypeScript** to run reliably within Vercel Serverless execution limits with zero cold-start delay.
- Create 5 high-fidelity native React cards in `components/stocks/`:
  1. `<CompanyValuationCard />` (Blended Fair Value, DCF bridge, Peer Multiples, 5×5 Sensitivity Grid)
  2. `<SepaStrategyCard />` (8-Condition Trend Template Scorecard, Stage 1-4 Badge, $+5\%$ Buy Zone, Position Sizing Calculator)
  3. `<EarningsBriefingCard />` (Upcoming Date, Consensus Range, Historical 4Q Beat/Miss %, Price Targets)
  4. `<OptionsPayoffCard />` (Interactive multi-leg Black-Scholes payoff simulator with dynamic sliders)
  5. `<StockLiquidityCard />` & `<EtfPremiumCard />` (Amihud/Slippage curve, NAV premium/discount & GEX indicators)
- Implement deterministic intent routing in `lib/chat/routing.ts` to guarantee zero-latency tool selection for valuation, SEPA, earnings, and derivatives queries.
- Maintain full compatibility with `localStorage` serialization, dark/light themes, and the "Card ABOVE text" (`以上是...`) rendering policy.

**Non-Goals:**
- Spawning local Python subshells or requiring server-side Python runtime.
- Executing live broker trades or handling user brokerage credentials.
- Storing user chat history on external databases (persists in browser `localStorage`).

## Decisions

### Decision 1: Pure TypeScript Quant Engine in `lib/quant/` vs Python Microservice
- **Choice**: Implement all mathematical algorithms in TypeScript inside `lib/quant/` (`valuation.ts`, `sepa.ts`, `black-scholes.ts`, `microstructure.ts`).
- **Rationale**: Serverless Next.js edge/node functions cannot easily spawn Python dependencies like `yfinance` or `scipy` without significant cold starts and external container overhead. Implementing closed-form solutions (e.g. Horner approximation for Black-Scholes normCDF, standard DCF discounting, regression for beta/trend) in TypeScript provides sub-millisecond execution, zero additional dependencies, and 100% type safety.
- **Alternatives Considered**:
  - *FastAPI Python backend*: High operational overhead, additional hosting costs, potential latency.

### Decision 2: Single-Action Structured State vs Multi-Step Streaming
- **Choice**: Compute quantitative model results in the Server Action and return a strongly typed JSON payload to the Client Component (`<CompanyValuationCard />`, `<OptionsPayoffCard />`), allowing the client to handle real-time slider adjustments locally.
- **Rationale**: Interactive sliders (such as altering IV, DTE, or WACC inputs) should update instantaneously on the client without firing server round-trips.

### Decision 3: Deterministic Routing Regex in `lib/chat/routing.ts`
- **Choice**: Expand deterministic keyword matching for valuation terms (`合理價`, `DCF`, `內在價值`, `WACC`), momentum terms (`SEPA`, `趨勢模板`, `VCP`, `買點`), earnings terms (`財報前瞻`, `earnings preview`), and derivatives terms (`選擇權損益`, `ETF溢價`, `流動性衝擊`).
- **Rationale**: Prevents LLM tool misclassification and saves prompt tokens while ensuring 100% predictable tool invocation.

## Risks / Trade-offs

- **[Risk] Missing or Delayed Fundamental Data for Obscure Tickers**
  → *Mitigation*: Graceful fallbacks in `lib/quant/valuation.ts` using sector benchmark defaults (e.g. Damodaran sector WACC/Beta tables) when individual company parameters are unavailable.
- **[Risk] Heavy Charting Component Bundle Size**
  → *Mitigation*: Use lightweight native SVG/HTML5 canvas or existing Recharts/Tailwind primitives already integrated into the repository.
- **[Risk] 60-Second Server Action Execution Budget**
  → *Mitigation*: Fast asynchronous data fetching through existing cached `fetchFinancialFundamentals` and parallel Yahoo/2MD promises.
