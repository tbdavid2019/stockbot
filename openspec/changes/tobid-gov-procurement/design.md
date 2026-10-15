# Design

## Context

Stockbot is a Next.js (App Router) financial intelligence application deployed on Vercel Serverless. Its multi-model architecture coordinates AI tools via `lib/chat/actions.tsx` and deterministic routing in `lib/chat/routing.ts`. Per repo guidelines, all analytical cards render strictly above text captions, and external network interactions must adhere to SSRF protections and zero-crash boundaries. ToBid provides an open, keyless MCP endpoint at `https://api.tobid.tw/mcp` offering access to 14M+ Taiwan public tender records, vendor reports, compliance records, and procurement forecasts.

See `proposal.md` for problem motivation and business background.

## Goals / Non-Goals

**Goals:**
- Provide a lightweight, serverless-friendly ToBid client in `lib/tobid.ts` executing JSON-RPC queries over Streamable-HTTP.
- Implement an in-memory B2G entity resolution dictionary for Taiwan listed stocks across 4 major sectors:
  1. **國防與航太軍工**：漢翔 (2634)、龍德造船 (6753)、雷虎 (8033)、亞航 (2630)、全訊 (5222)。
  2. **資訊軟體/雲端/資安**：精誠 (6214)、零壹 (3029)、邁達特 (6112)、凌群 (2453)、資通 (2471)、安碁資訊 (6690)、叡揚 (6752)。
  3. **公共工程/水資源/重電**：中鼎 (9933)、欣陸 (3703)、工信 (5521)、山林水 (8473)、國統 (8936)、華城 (1519)、士電 (1503)、中興電 (1513)、亞力 (1514)。
  4. **綠能與儲能特許標案**：泓德能源 (6873)、雲豹能源 (6869)、森崴能源 (6806)。
- Implement fundamental black swan risk check (`vendor_compliance`) for Article 101 debarment (拒絕往來/停權).
- Parse and display top 5 client government agencies (client concentration) and head-to-head competitor matchups (e.g. 漢翔 vs 亞航 97 次交手紀錄).
- Expose a `showGovProcurement` tool in `lib/chat/actions.tsx` rendering an interactive `<GovBidsCard />` above text responses.
- Ensure strict resilience with an `AbortController` 4-second timeout, in-memory cache, and non-blocking fallback.

**Non-Goals:**
- Full local duplication or crawling of Taiwan's 14M+ public tender database.
- Procurement data for non-Taiwanese markets (US / global procurement is handled via existing SEC / web search flows).
- Direct bid submission or procurement workflow automation.

## Decisions

### Decision 1: Lightweight Fetch JSON-RPC Client over Full MCP SDK
- **Choice**: Implement a native `fetch`-based client issuing standard JSON-RPC requests to the ToBid Streamable-HTTP endpoint (`https://api.tobid.tw/mcp`).
- **Rationale**: Vercel Serverless execution environments require fast cold starts and clean connection tear-down. Native `fetch` avoids long-running stream listeners or socket leaks that can occur with complex SDK client runtimes.
- **Alternatives Considered**: Full `@modelcontextprotocol/sdk` client daemon—rejected due to serverless bundle overhead and lifecycle mismatch.

### Decision 2: Hybrid Entity Resolution (Static Dictionary + Dynamic Fallback)
- **Choice**: Pre-configure an in-memory dictionary of high-frequency Taiwan B2G listed tickers across the 4 key sectors (20+ companies), dynamically invoking ToBid's `find_entity` tool only when a ticker/query is unmapped.
- **Rationale**: Eliminates a network roundtrip for 90%+ of queries, keeping response times under 500ms while retaining universal fallback coverage.
- **Alternatives Considered**: Always calling `find_entity` on every query—rejected due to adding an extra 1-2s roundtrip latency.

### Decision 3: Parallel Intelligence Gathering (Vendor Report + Compliance Audit)
- **Choice**: When a target company is queried, execute `vendor_report` and `vendor_compliance` in parallel via `Promise.allSettled`.
- **Rationale**: Combining fundamental tender metrics (win rate, accumulated awards, top agencies, competitor matchups) with the Article 101 black swan debarment check in a single roundtrip guarantees comprehensive risk management without increasing user wait time.

### Decision 4: Intent-Driven Conditional Activation
- **Choice**: Activate procurement queries via `lib/chat/routing.ts` only when tender keywords appear ("標案", "得標", "台電電網", "國防標案", "政府採購", "停權", "拒絕往來") or when recognized B2G stocks are queried.
- **Rationale**: Pure export or consumer semiconductor firms (e.g., TSMC, MediaTek) have negligible Taiwan government contracts; invoking tender tools unconditionally would pollute context and slow down responses.

### Decision 5: Zero-Crash Resilient Error Handling
- **Choice**: Wrap all external calls with an `AbortController` (4-second timeout) and try/catch blocks that return an empty state or advisory message instead of throwing.
- **Rationale**: ToBid is a public free endpoint without formal SLA. The chat session must never fail or crash if the third-party endpoint undergoes maintenance or latency spikes.

## Risks / Trade-offs

- **[Risk: Upstream Endpoint Downtime or High Latency]** → Add strict 4-second timeout and graceful degradation; fallback to web search if ToBid fails.
- **[Risk: Upstream Rate Limiting]** → Maintain a 60-minute in-memory cache for vendor reports and tender search results to reduce redundant upstream calls.
- **[Risk: Black Swan False Positives / Sub-entity Misalignment]** → Distinguish between exact company match and subsidiaries in the compliance audit, stating the exact legal entity name that received any Article 101 sanction.
