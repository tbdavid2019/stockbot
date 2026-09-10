## 1. Provider Core & Configuration (Phase 1 Foundation)

- [x] 1.1 Capture the live Stockdata OpenAPI and manifests as schema references, noting REST 2.2.0 vs MCP 2.4.0; verify the full endpoint inventory for prediction, macro, broker, institutional, company-profile, and discovery paths.
- [x] 1.2 Add server-only `STOCKDATA_BASE_URL`, `STOCKDATA_ENABLED`, per-domain feature flags, endpoint-class timeout budgets, and cache settings to environment config and `.env.example`; verify credentials remain server-only and timeout values are not hardcoded into individual cards.
- [x] 1.3 Create the shared Stockdata result envelope and Zod validators in `lib/stockdata/types.ts` for source metadata, status, warnings, and JSON-safe serialization with strict null handling.
- [x] 1.4 Implement server-side client `lib/stockdata/client.ts` with endpoint-specific bounded timeouts, singleflight request deduplication, memory TTL cache (60s), circuit breaker (2 failures / 30s cooldown), and response payload bounding (top 10-15 rows) while preserving counts, filters, dates, and truncation warnings.
- [x] 1.5 Implement market/ticker normalization for Taiwan tickers (`2330`, `2330.TW`), US tickers, and resolver responses; ensure ambiguous queries return explicit clarification states.

## 2. Quant Predictions & Resonance Integration (Phase 1 Core)

- [x] 2.1 Add typed adapters for resonance, Xuantie pullback, LSTM bullish/bearish top picks, TimesFM bullish/bearish top picks, latest batch snapshots, per-symbol prediction trajectory, and `/predictions/resolve/{query}`; verify resonance categories come from returned tags rather than assumed separate endpoints.
- [x] 2.2 Create native prediction React cards (`ResonanceCard`, `PredictionTopPicksCard`, `PredictionHistoryCard`) with model provenance, horizon, timestamp, and stale status; ensure cards render strictly ABOVE captions.
- [x] 2.3 Add deterministic routing in `lib/chat/routing.ts` and server tool `showStockPredictions` in `lib/chat/actions.tsx` for multi-strategy resonance, TimesFM, LSTM, and Xuantie queries.
- [x] 2.4 Persist normalized prediction results to `localStorage` via `lib/chat-history.tsx` and ensure refreshed sessions restore cards cleanly without RSC streaming.
- [x] 2.5 Verify prediction fallback behavior: upstream outage gracefully displays an unavailable card without degrading existing local SEPA, DCF, or 13-master tools.

## 3. Broker Branches, Market-Wide Institutional Flows & Company Data (Phase 2)

- [x] 3.1 Add typed adapters for broker summary, trades, and trend (`/market/broker/summary|trades|trend/{ticker}`), market-wide institutional rankings (`/market/institutional/top`), company profile/news, and bounded company-profile batch endpoints; verify representative live responses and per-symbol partial failures.
- [x] 3.2 Add native `BrokerBranchCard` (summary, trade detail, trend), `InstitutionalLeaderboardCard` (market-wide net flow leaders), and `CompanyProfileCard` (profile/news and bounded batch results).
- [x] 3.3 Add anti-collision deterministic routing: route per-symbol broker branch requests to `showStockBrokerBranches`, market-wide flow rankings to `showMarketInstitutionalLeaderboard`, and company profile requests to `showStockCompanyProfile`, strictly preserving official per-symbol flows in `showInstitutionalFlow`.
- [x] 3.4 Persist broker, institutional, and company-profile results to `localStorage` with source/as-of timestamps, bounded JSON-safe data, and per-symbol error states.

## 4. Macro Risk Regime, Macro Datasets & Polymarket Sentiment (Phase 3)

- [x] 4.1 Add typed adapters for macro risk regime (`/macro/latest`), Investing summary, FedWatch, US earnings calendar, Stockdata economic calendar, commodities, and Polymarket sentiment; verify `exposure` remains a 0.0–1.0 float until presentation formatting.
- [x] 4.2 Add native `MacroRiskRegimeCard` (exposure % gauge, regime state), `StockdataMacroDatasetCard` (FedWatch/earnings/economic calendar/commodities), and `PolymarketSentimentCard` (prediction market probabilities with clear sentiment disclaimer); ensure cards render ABOVE captions.
- [x] 4.3 Add deterministic routing for `showMacroRiskRegime` and the new Stockdata macro dataset intents, while preserving the existing Investing.com economic calendar in `showEconomicCalendar` for its current contract.
- [x] 4.4 Persist macro regime, macro dataset, and Polymarket tool results to `localStorage` with source, as-of, fetched timestamp, and partial/stale status retention.

## 5. Verification, Documentation & Phased Rollout (Phase 4)

- [x] 5.1 Implement optional server-side retrieval and validation of `/openapi.json`, `/.well-known/mcp.json`, `/.well-known/ai-plugin.json`, `/mcp.json`, and `/health` behind the provider boundary, keeping MCP SSE transport disabled by default for web chat.
- [x] 5.2 Update `lib/chat/followup-context.ts` to generate actionable follow-up suggestions for predictions, broker branches, and macro regime without inventing metrics.
- [x] 5.3 Update `public/llms.txt`, `public/llms-full.txt`, and README with the new Stockdata-backed tools, tool routing boundaries, and source/stale semantics.
- [x] 5.4 Run `npx openspec validate integrate-stockdata-quant-api --strict`, static source/schema inspection, and read-only remote smoke checks for predictions, broker branches, macro regime, and discovery. Do not run local `pnpm type-check`, `pnpm build`, tests, or a dev server; CI/CD and Vercel are the execution environment for those checks.
