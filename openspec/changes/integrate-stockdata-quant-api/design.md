## Context

See `proposal.md` for the motivation and user-facing scope. Stockbot currently routes chat intents to server-side tools in `lib/chat/actions.tsx`, renders native cards above captions, and persists normalized tool results through `lib/chat-history.tsx`. Existing local quantitative engines remain the authoritative source for valuation, SEPA, earnings preview, options, liquidity, ETF premium, macro factor, and per-symbol official institutional flows (`showInstitutionalFlow`).

The external service `stockdata.david888.com` documents REST endpoints, OpenAPI, MCP, and WebMCP discovery surfaces. Live inspection verifies 29 active endpoints across prediction models (LSTM, TimesFM, Xuantie, Resonance), macro regime/exposure, broker branches, and market-wide rankings. The REST OpenAPI reports version `2.2.0` while MCP manifests report `2.4.0`. To ensure predictable execution within Vercel's 60-second Server Action budget and avoid monolithic regression, integration is divided into 3 distinct operational phases, with REST as the sole production transport.

The verified REST inventory for this change is rooted at `/api/v1`: predictions (`resonance`, `xuantie`, `lstm/top-bullish`, `lstm/top-bearish`, `timesfm/top-bullish`, `timesfm/top-bearish`, `latest`, `history/{ticker}`, `resolve/{query}`), market intelligence (`broker/summary|trades|trend/{ticker}`, `institutional/top`, `institutional/dates`, `institutional/{ticker}`, `company-profile`, `company-profile/{ticker}`, `company-profiles`, `company-profiles/batch`, `market/stats`), and macro datasets (`latest`, `investing/summary`, `investing/fed-rate`, `investing/earnings-calendar`, `investing/economic-calendar`, `investing/commodities`, `polymarket/sentiment`). Discovery retrieval also covers `/health`, `/openapi.json`, `/.well-known/mcp.json`, `/.well-known/ai-plugin.json`, `/mcp.json`, and the documented WebMCP bridge/skill URLs as diagnostics only.

## Goals / Non-Goals

**Goals:**

- Add a server-only Stockdata provider boundary (`lib/stockdata/`) exposing normalized, JSON-safe, bounded data to chat tools and native cards.
- Implement a 3-phase delivery pipeline:
  - **Phase 1**: ML predictions & multi-strategy resonance (LSTM, TimesFM, Xuantie, Resonance, latest snapshots).
  - **Phase 2**: Broker branch tracking (`/market/broker/summary`, `trades`, `trend`), market-wide institutional leaderboard (`/market/institutional/top`), and company profile/news/batch data.
  - **Phase 3**: Macro risk regime / exposure (`/macro/latest`), FedWatch, earnings calendar, commodities, economic calendar, and Polymarket prediction market sentiment.
- Strictly distinguish tool intents to prevent collisions with existing official TWSE/TPEX and Investing.com cards.
- Truncate and bound API responses (e.g., top 10-15 rows) to prevent token bloat and Server Action timeout.
- Enforce the Card Positioning Policy: all cards render ABOVE captions, accompanied by "以上是..." / "如上方所示..." wording.
- Keep existing local tools and cards operational without regression if Stockdata is unavailable.

**Non-Goals:**

- Reimplementing external LSTM, TimesFM, Xuantie, or resonance models locally.
- Replacing existing per-symbol official institutional flows (`showInstitutionalFlow`), Investing.com calendar (`showEconomicCalendar`), or local DCF/SEPA tools.
- Activating MCP/WebMCP SSE transports in the web chat UI (deferred to future headless agent use cases).
- Making browser clients call Stockdata directly.

## Decisions

### 1. Phased Delivery Strategy (3+1 Phases)

To prevent scope bloat and enable incremental verification, work is structured into four stages:

1. **Phase 1: Quant Predictions & Resonance (Core Differentiator)**
   - API Client infrastructure (`lib/stockdata/client.ts`, Zod envelopes, singleflight, memory cache, circuit breaker).
   - Predictions adapters and native cards: `ResonanceCard`, `PredictionTopPicksCard`, `PredictionHistoryCard`.
   - Deterministic routing for "共振", "TimesFM 看漲/看跌", "LSTM 預測排行", "玄鐵回調", latest snapshot, and prediction history. Resonance categories are rendered only when returned by the single upstream resonance endpoint.
2. **Phase 2: Broker Branches, Market-Wide Institutional Leaderboards & Company Data**
   - Broker branch adapter and native card: `BrokerBranchCard` (summary, trades, trend, top buyers/sellers per stock).
   - Market-wide institutional leaderboard card: `InstitutionalLeaderboardCard` (Top net buying/selling across TWSE/TPEX).
   - Company profile/news and bounded batch profile cards.
   - Clear routing boundaries separating official per-symbol flows from broker branches and market-wide rankings.
3. **Phase 3: Macro Risk Regime, Macro Datasets & Polymarket Sentiment**
   - Macro risk adapter and card: `MacroRiskRegimeCard` (Exposure %, bull pullback / bear status, VIX/SOX/SPY indicators).
   - FedWatch, earnings calendar, commodities, and Stockdata economic-calendar views, preserving the existing Investing.com card for its current contract.
   - Polymarket macro sentiment card: `PolymarketSentimentCard` (Prediction market probabilities clearly labeled as sentiment, not factual data).
4. **Phase 4 (Deferred / Diagnostics Only): OpenAPI & Discovery Diagnostics**
   - Health check plus read-only OpenAPI/MCP/plugin/WebMCP discovery diagnostics. MCP SSE remains disabled by default for web chat; the current upstream MCP manifest is version `2.4.0` and exposes SSE metadata, while REST remains the only production transport in this change.

### 2. Explicit Tool Intent Boundaries (Routing Anti-Collision)

To prevent ambiguity between existing local tools and new Stockdata tools in `lib/chat/routing.ts`:

| User Intent | Designated Tool | Backend Provider | Output Card |
| :--- | :--- | :--- | :--- |
| 個股官方三大法人買賣超、外資持股比、土洋籌碼標籤 | `showInstitutionalFlow` | TWSE/TPEX 官方資料 | `<InstitutionalFlowCard />` (既有) |
| 個股主力券商分點進出、買賣超券商排行 | `showStockBrokerBranches` | Stockdata `/market/broker/summary` | `<BrokerBranchCard />` (新增 Phase 2) |
| 全市場三大法人買賣超排行、外資/投信今日買超前幾名 | `showMarketInstitutionalLeaderboard` | Stockdata `/market/institutional/top` | `<InstitutionalLeaderboardCard />` (新增 Phase 2) |
| 全球經濟數據日曆、美股期指、商品即時走勢 | `showEconomicCalendar` | Investing.com / 2MD | `<EconomicCalendarCard />` (既有) |
| 全球/台股宏觀市場曝險比例、多空風控 Regime | `showMacroRiskRegime` | Stockdata `/macro/latest` | `<MacroRiskRegimeCard />` (新增 Phase 3) |
| 個股時序預測、多策略共振焦點、LSTM/TimesFM/玄鐵 | `showStockPredictions` | Stockdata `/predictions/*` | `<PredictionCards />` (新增 Phase 1) |
| 個股公司簡介、即時新聞、批次公司資料 | `showStockCompanyProfile` | Stockdata `/market/company-profile*` | `<CompanyProfileCard />` (新增 Phase 2) |

### 3. Server-side REST Adapter with Bounded Payloads

Create `lib/stockdata/` with a shared envelope:

```ts
type StockdataResult<T> = {
  data?: T
  source: { provider: 'stockdata.david888.com'; url: string; fetchedAt: string; asOf?: string }
  status: 'live' | 'cached' | 'stale' | 'partial' | 'unavailable'
  warnings: string[]
}
```

- **Payload Bounding**: Raw endpoint responses containing many items (e.g. latest snapshots or broker trades) are capped at top 10-15 rows before formatting into the tool result, while preserving provider counts, dates, filters, and truncation warnings. Verbose news snippets are truncated to 150 characters to protect LLM context windows and keep Server Actions fast.
- **Singleflight & Cache**: Deduplicate concurrent requests and cache read-only snapshots in memory for 60 seconds.
- **Circuit Breaker**: Trip after 2 consecutive upstream failures with a 30-second cooldown, immediately returning `{ status: 'unavailable' }` without blocking RSC streaming.

### 4. Zero-Fake-Data & Card Positioning Policy

- If an external field is `null` (e.g., `pe: null` or `is_stale: null`), cards display `—` or `待確認`. No fallback defaults or synthetic numbers are permitted.
- All cards render strictly **ABOVE** the caption. Captions generated by `generateCaption` must reference the card using "以上是..." or "如上方所示...", never "以下是...".
- Tool calls serialize clean JSON into `localStorage` via `lib/chat-history.tsx` without nesting secondary React server streams.

## Risks / Trade-offs

- **[Upstream Latency & 60s Timeout]** → Use endpoint-specific configurable timeout budgets, bounded payload truncation, and cache repeated reads so heavier macro responses are not rejected by an overly aggressive global timeout.
- **[Intent Ambiguity]** → Use strict regex and keyword patterns in `lib/chat/routing.ts` to separate broker branches, market-wide rankings, and official flows.
- **[Model Uncertainty Confusion]** → Clearly badge ML predictions with horizon (e.g., "下一交易日"), model name (LSTM/TimesFM), and timestamp. Polymarket odds are explicitly labeled as "預測市場機率".
- **[Scope Overload]** → Phase 1 delivers immediate, high-value predictions without touching macro or market routing, eliminating cross-domain regression risks.

## Migration Plan

1. **Phase 1 Implementation**: Add `lib/stockdata/` client, implement prediction adapters, add `PredictionCards`, register deterministic routing for predictions, and add `localStorage` history restoration.
2. **Phase 2 Implementation**: Add broker branch, market-wide institutional flow, company profile/news, and batch profile tools/cards, then update routing rules.
3. **Phase 3 Implementation**: Add macro risk regime, FedWatch, earnings calendar, commodities, external economic calendar, and Polymarket sentiment cards and routing.
4. **Phase 4 & Rollout**: Update `public/llms.txt`, verify builds and OpenSpec compliance, and enable feature flags.
5. **Rollback**: Disabling `STOCKDATA_ENABLED` cleanly falls back to existing local tools without breaking persisted sessions.

## Open Questions

- Upstream `exposure` in `/macro/latest` is returned as a float (e.g., `0.85`); card will format this as `85%` with explicit boundary checks [0.0 - 1.0].
- Symbol resolution handles both `2330` and `2330.TW` gracefully, standardizing internally to the canonical market format.
