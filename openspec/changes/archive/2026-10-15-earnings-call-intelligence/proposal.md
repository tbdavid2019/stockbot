# Proposal

## Why

Investors often struggle to track fragmented earnings call (法人說明會 / 財報電話會議) schedules, webcast streams, and presentation decks across Taiwan (TWSE/TPEX/MOPS) and US markets (Yahoo Finance/Investing.com/IR). Providing an integrated Earnings Call intelligence card with instant AI presentation deck analysis (via 2MD AnyDoc) empowers users to monitor upcoming conferences, access webcasts, and extract forward-looking management guidance and CapEx plans in seconds.

## What Changes

- Add a unified data integration module `lib/quant/earnings-call.ts` aggregating Taiwan Market (TWSE/TPEX/MOPS investor conference schedules, webcast links, PDF slides) and US Market (Yahoo Finance/Investing.com earnings call schedules, company IR webcasts, deck URLs).
- Introduce `<EarningsCallCard />` in `components/stocks/earnings-call-card.tsx` with market switching (TW / US / All), status filtering (Live / Today / Upcoming / Replay), webcast links, presentation deck downloads, and one-click AI presentation extraction.
- Integrate one-click AI presentation analysis: wire the 2MD AnyDoc engine (`parseDocument2MD` / `readUrl2MD`) to extract management guidance (營收/毛利率指引), CapEx (資本支出), capacity utilization, and key financial highlights directly from conference PDF decks.
- Register `showEarningsCalls` tool in `lib/chat/actions.tsx` and integrate deterministic intent routing in `lib/chat/routing.ts` for natural language triggers (e.g., "法說會日程", "台積電法說會", "NVDA earnings call", "近期法說會", "財報電話會議").
- Update `lib/chat-history.tsx` to persist and rehydrate `showEarningsCalls` UI states cleanly from `localStorage`.
- Strictly enforce `AGENTS.md` guidelines: card positioning above caption text ("以上是...", "如上方所示..."), pure JSON serialization, zero-hallucination source verification, and explicit market timezone handling (`Asia/Taipei` for TW, `America/New_York` for US).

## Capabilities

### New Capabilities
- `earnings-call-intelligence`: Comprehensive tracking, multi-market schedule aggregation, live webcast and deck access, and 2MD AnyDoc-powered AI guidance extraction for Taiwan and US earnings calls (法人說明會 / 財報電話會議).

### Modified Capabilities
*(None. Existing `earnings-intelligence` pre-earnings estimate consensus and beat/miss requirements remain intact.)*

## Impact

- **Backend & Data**: New `lib/quant/earnings-call.ts` implementing resilient fetching and parsing from TWSE/TPEX/MOPS and US earnings calendar feeds with singleflight deduplication and short-lived caching.
- **AI Tooling & Actions**: `lib/chat/actions.tsx` registers `showEarningsCalls` tool returning structured earnings call items and summary caption.
- **Intent Routing**: `lib/chat/routing.ts` adds `showEarningsCalls` to `DeterministicToolName` with regex matching for ticker-specific and market-wide earnings call inquiries.
- **UI Components**: New `components/stocks/earnings-call-card.tsx` providing responsive filtering, badges, webcast links, deck downloads, and inline 2MD AI summary trigger.
- **Client Persistence**: `lib/chat-history.tsx` adds `case 'showEarningsCalls'` in `createUIStateFromStoredMessages`.
- **API & 2MD**: Connects existing `/api/parse-document` and `lib/2md.ts` to power instantaneous deck parsing from presentation URLs.
- **Dependencies**: No external npm packages required; leverages existing Next.js, React, Tailwind CSS, Lucide icons, and 2MD infrastructure.
