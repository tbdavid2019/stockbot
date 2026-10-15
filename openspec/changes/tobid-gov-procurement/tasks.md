# Tasks

## 1. ToBid Client, Entity Resolution & Compliance Audit

- [x] 1.1 Create `lib/tobid.ts` implementing a lightweight JSON-RPC client over Streamable-HTTP (`https://api.tobid.tw/mcp`) supporting `vendor_report`, `vendor_compliance`, `search_tenders`, `procurement_forecast`, and `find_entity` with 4-second `AbortController` timeout and LRU cache; verify with unit test `node --experimental-strip-types lib/tobid.test.ts`.
- [x] 1.2 Implement Taiwan listed company B2G entity resolution dictionary in `lib/tobid-entities.ts` covering 4 key sectors (軍工: 2634, 6753, 8033, 2630, 5222; 資服資安: 6214, 3029, 6112, 2453, 2471, 6690, 6752; 重電工程水資源: 9933, 3703, 5521, 8473, 8936, 1519, 1503, 1513, 1514; 綠能儲能: 6873, 6869, 6806) with fuzzy fallback; verify with test assertions in `lib/tobid.test.ts`.

## 2. Dynamic Routing & Tool Integration

- [x] 2.1 Add procurement & debarment intent detection in `lib/chat/routing.ts` to identify tender queries ("標案", "得標", "台電電網", "國防標案", "政府採購", "停權", "拒絕往來") and B2G stock categories; verify with `node --experimental-strip-types lib/chat/routing.test.ts`.
- [x] 2.2 Add `showGovProcurement` tool in `lib/chat/actions.tsx` to execute `vendor_report` and `vendor_compliance` in parallel, returning structured procurement intelligence and black swan risk audit with graceful error fallback; verify via `npx tsc --noEmit`.

## 3. UI Component & Card Presentation

- [x] 3.1 Implement `<GovBidsCard />` in `components/chat/gov-bids-card.tsx` rendering contract totals, win rate, top 5 procuring agencies (e.g. 國防部、空軍司令部), competitor matchup history (e.g. 漢翔 vs 亞航 97 場對戰), and Article 101 compliance badge (Safe / Red Alert), adhering to Card Positioning Policy (card rendered strictly above text caption); verify with `npx tsc --noEmit`.
- [x] 3.2 Wire `<GovBidsCard />` into `lib/chat/actions.tsx` and ensure responsive theme styling matches Impeccable design standards; verify via TypeScript compilation.

## 4. Documentation & Verification

- [x] 4.1 Update `docs/architecture/03-quant-and-market.md` and `AGENTS.md` to document the ToBid procurement intelligence integration, fallback strategy, entity resolution, and black swan debarment audit; verify markdown links and syntax.
- [x] 4.2 Run full TypeScript type check (`npx tsc --noEmit`) and execute all unit tests (`node --experimental-strip-types lib/tobid.test.ts` and `node --experimental-strip-types lib/chat/routing.test.ts`) to ensure zero regressions across the codebase.
