# Design

## Context

Stockbot currently provides pre-earnings briefing via `previewEarnings` (analyst consensus estimates and 4-quarter beat/miss history) and general macro calendar via `showEconomicCalendar`. However, investors lack an integrated view of actual **Earnings Calls (法人說明會 / 財報電話會議)**—including scheduled conference dates, live webcast links, presentation slide decks, and management forward guidance.

See `proposal.md` for motivation and background.

Existing system architectural constraints (from `AGENTS.md`):
- **Card Positioning Policy**: All financial cards must render strictly **above** the assistant caption text, and caption phrasing must use "以上是..." or "如上方所示...", never "以下是...".
- **Zero Hallucination & Live Verification**: Data must come from verified public sources (TWSE, TPEX, MOPS, Yahoo Finance, Investing.com) or 2MD live reader.
- **LocalStorage Persistence**: Session history and card arguments must be purely serializable as JSON in `lib/chat-history.tsx` without secondary RSC nested streams.
- **Timezone & Midnight Boundaries**: Events must be anchored to explicit market timezones (`Asia/Taipei` for TW, `America/New_York` for US) with end-of-day boundary clamping.
- **2MD AnyDoc Engine**: Document parsing leverages `lib/2md.ts` (`parseDocument2MD`, `readUrl2MD`) and `/api/parse-document`.

## Goals / Non-Goals

**Goals:**
- Provide a unified data aggregation module `lib/quant/earnings-call.ts` supporting both Taiwan (TWSE/TPEX/MOPS) and US markets (Yahoo Finance / Investing.com / IR).
- Build a native React card `<EarningsCallCard />` with multi-market tabs (TW / US / All), timeline status filters (Live/Today, Upcoming, Historical Replay), webcast links, and deck downloads.
- Wire one-click AI presentation deck parsing with 2MD AnyDoc to extract forward-looking management guidance, CapEx, and strategic takeaways without leaving the chat interface.
- Add `showEarningsCalls` to deterministic routing in `lib/chat/routing.ts` and register the tool in `lib/chat/actions.tsx`.
- Enable full rehydration of `<EarningsCallCard />` from `localStorage` in `lib/chat-history.tsx`.

**Non-Goals:**
- Real-time speech-to-text / live audio stream transcription during calls (users use official webcasts; AI analysis focuses on official slides and released documents).
- Replacing or modifying the consensus EPS/revenue estimate modeling in `previewEarnings`.
- Subscribing to paid financial terminals (e.g. Bloomberg, FactSet); the solution uses free official feeds and 2MD fast web extraction.

## Decisions

### 1. Unified Data Aggregator Architecture (`lib/quant/earnings-call.ts`)
- **Choice**: Implement `fetchEarningsCalls({ symbol?, market?, limit? })` that queries:
  - Taiwan Market: MOPS / TWSE Open Data (法說會行事曆與重大訊息)，extracting company code, date/time, conference type, webcast URL, and PDF presentation links.
  - US Market: Yahoo Finance / Investing.com earnings calendar feeds alongside company IR portals.
  - Singleflight deduplication and a 10-minute in-memory cache to prevent redundant external fetches.
- **Alternatives Considered**: Scraping via generic web search on each prompt. Rejected because search results yield unstructured snippets without verified slide URLs and standardized timestamps.

### 2. One-Click AI Presentation Analysis Workflow
- **Choice**: When a conference entry includes a presentation slide deck URL (PDF or web link):
  - Card presents an "AI 解析簡報" action button.
  - Clicking calls `/api/parse-earnings-deck` (or existing `/api/parse-document` / `lib/2md.ts` pipeline) to fetch and parse the PDF into structured markdown.
  - An inline expandable panel displays the AI-extracted briefing:
    - 📊 **業績回顧與財務亮點** (Revenue, Gross Margin, Operating Margin)
    - 🧭 **經營層未來指引 (Guidance)** (Next-quarter & full-year outlook)
    - 🏭 **資本支出 (CapEx) 與產能規劃** (Fab expansion, equipment investment)
    - ⚠️ **潛在營運風險與同業競爭** (Key management disclaimers and headwinds)
- **Alternatives Considered**: Streaming the analysis directly into a new chat turn. Rejected because users exploring multiple conferences would clutter their conversation history with full deck dumps.

### 3. Intent Routing & Deterministic Handling (`lib/chat/routing.ts`)
- **Choice**: Add `showEarningsCalls` to `DeterministicToolName`.
  - Regex pattern matches: `法說會|法人說明會|財報電話會議|earnings call|investor conference|法說日程|法說簡報|法說會行事曆|webcast`.
  - Works with or without a resolved ticker:
    - With ticker (e.g. "台積電法說會", "NVDA earnings call"): routes to `showEarningsCalls` with `symbol`.
    - Without ticker (e.g. "近期法說會日程", "本週美股財報電話會議"): routes to `showEarningsCalls` with `market` filter and multi-stock calendar view.
- **Alternatives Considered**: Relying purely on LLM function calling. Rejected due to latency and risk of weaker models falling back to generic web search.

### 4. Timezone Isolation and Formatting
- **Choice**: Format Taiwan events using `Intl.DateTimeFormat` with `timeZone: 'Asia/Taipei'` and US events with `timeZone: 'America/New_York'`.
  - Tag every conference with explicit market indicators (🇹🇼 台股 `Asia/Taipei` / 🇺🇸 美股 `America/New_York`).
  - Calculate relative countdowns (e.g. "今日 14:00", "3 天後", "已結束") based on respective market local midnight boundaries using `getEndOfDay`.

### 5. Card UI & AGENTS.md Compliance
- **Choice**: `<EarningsCallCard />` implemented as a client component in `components/stocks/earnings-call-card.tsx`:
  - Placed strictly above `BotCaption`.
  - Responsive layout with badge colors (🟢 進行中 / 🔵 即將舉行 / ⚪ 歷史回放).
  - External links for Webcast (影音直播) and Deck (簡報下載).
  - Serialized cleanly to `localStorage` through `result: { data, caption }`.

## Risks / Trade-offs

- **[Risk] Upstream format changes on MOPS/TWSE or US calendar pages** → *Mitigation*: Provide resilient regex parsers, fallback to 2MD live search extraction, and display graceful error boundary if an upstream page structure shifts.
- **[Risk] Large PDF presentation files (e.g. >20MB) taking long to parse** → *Mitigation*: 2MD AnyDoc supports up to 25MB with 60s timeout, shows an animated loading state on the button, and catches errors with actionable retry hints.
- **[Risk] Missing presentation deck or webcast URL for smaller companies** → *Mitigation*: If no direct deck URL exists, card displays a "查閱官網 IR" button linking to the official investor relations landing page.
