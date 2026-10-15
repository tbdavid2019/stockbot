# Tasks

## 1. Multi-Market Data Ingestion & Earnings Call Aggregator

- [x] 1.1 Implement data structures and TypeScript interfaces for `EarningsCallItem`, `EarningsCallDashboardResult`, and filter parameters in `lib/quant/earnings-call.ts`. Verify type exports compile cleanly.
- [x] 1.2 Implement Taiwan market earnings conference aggregator parsing TWSE/TPEX/MOPS investor conference announcements, session dates, webcast streams, and PDF presentation slide links in `lib/quant/earnings-call.ts`. Verify function returns structured entries with `Asia/Taipei` timezone formatting.
- [x] 1.3 Implement US market earnings call aggregator extracting conference schedules, webcast URLs, and IR presentation links in `lib/quant/earnings-call.ts`. Verify function returns structured entries with `America/New_York` timezone formatting.
- [x] 1.4 Implement unified `fetchEarningsCalls` entrypoint with in-memory TTL caching (10 minutes) and singleflight request deduplication. Verify concurrent requests for the same symbol/market are coalesced without duplicate network fetches.

## 2. One-Click AI Presentation Analysis Engine

- [x] 2.1 Implement `/api/parse-earnings-deck` API route with SSRF validation (`isSafeApiBaseUrl`) and 2MD AnyDoc integration (`parseDocument2MD` / `readUrl2MD`). Verify API rejects internal or unsafe IP addresses and accepts valid remote presentation PDFs.
- [x] 2.2 Implement structured AI extraction logic to parse management guidance (營收/毛利率指引), capital expenditure (CapEx), capacity expansion, and strategic highlights from parsed markdown. Verify sample earnings call decks produce structured guidance outputs.

## 3. UI Components & Interactive Financial Card

- [x] 3.1 Create `<EarningsCallCard />` in `components/stocks/earnings-call-card.tsx` supporting market switching (🇹🇼 台股, 🇺🇸 美股, 🌐 全部) and timeline status filtering (🔴 進行中 / 🔵 今日與即將舉行 / ⚪ 歷史回放). Verify filter controls toggle displayed items without triggering server roundtrips.
- [x] 3.2 Build conference item rows with status badges, date/time countdowns, live webcast launch links, and presentation PDF download links. Verify responsive styling across mobile and desktop viewports.
- [x] 3.3 Add one-click "AI 解析簡報" trigger button and inline expandable briefing drawer in `<EarningsCallCard />`, wiring loading state, error boundary, and rendered guidance sections. Verify clicking the button displays the parsed AI summary.

## 4. Intent Routing, AI Tool Integration & Persistence

- [x] 4.1 Add `showEarningsCalls` to `DeterministicToolName` in `lib/chat/routing.ts` and implement regex pattern matching for ticker-specific and market-wide inquiries (e.g., "法說會日程", "台積電法說會", "NVDA earnings call", "近期財報電話會議"). Verify regex routes matches correctly.
- [x] 4.2 Register `showEarningsCalls` tool inside `streamUI` in `lib/chat/actions.tsx`, ensuring `<EarningsCallCard />` renders above `BotCaption` and caption copy strictly uses "以上是..." phrasing per AGENTS.md. Verify tool execution produces valid card and caption.
- [x] 4.3 Update `lib/chat-history.tsx` to handle `case 'showEarningsCalls'` in `createUIStateFromStoredMessages`. Verify stored chat sessions restore `<EarningsCallCard />` accurately from `localStorage`.

## 5. Integration, Validation & Documentation

- [x] 5.1 Run full project type checking (`pnpm run type-check` or `npm run type-check`) and verify zero TypeScript or linting errors.
- [x] 5.2 Update `AGENTS.md` and `README.md` to document the `showEarningsCalls` capability, 2MD deck analysis workflows, and query syntax examples. Verify documentation reflects the new architecture accurately.
