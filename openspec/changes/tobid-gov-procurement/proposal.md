# Proposal

## Why

Historical financial metrics (past revenue, quarterly EPS) are lagging indicators that fail to capture forward-looking order pipelines of B2G (Business-to-Government) listed companies in Taiwan—such as heavy electric equipment (台電強韌電網), defense/aerospace (國防部/中科院標案), IT services / cybersecurity (公部門資訊專案), water treatment, and green energy concessions. By integrating ToBid's open government procurement intelligence (14M+ tender records), Stockbot can uncover order visibility, contract win rates, bidding price margins, head-to-head competitor matchups, and procurement forecasts 1-3 months ahead of formal tender execution. Furthermore, checking Article 101 debarment status (`vendor_compliance`) provides critical black swan risk prevention.

## What Changes

- Add a server-side ToBid MCP / REST client wrapper with timeout isolation (3-5s), request clamping, and entity resolution mapping for 4 major B2G stock sectors (Defense, IT/Security, Heavy Electric/Water/Engineering, Green Energy).
- Integrate fundamental "black swan" risk checking via `vendor_compliance` to audit government debarment (拒絕往來 / 停權) under Article 101 of the Government Procurement Act.
- Integrate dynamic query routing in `lib/chat/routing.ts` to trigger procurement intelligence for B2G stocks and tender-related inquiries ("標案", "得標", "台電電網", "國防標案", "政府採購", "停權").
- Implement an interactive `<GovBidsCard />` UI component rendering win rate metrics, historical contract totals, top procuring government agencies, competitor matchups, and procurement forecasts above the text response.
- Expose a `showGovProcurement` tool in `lib/chat/actions.tsx` to serve multi-agent and user-facing analysis flows.

## Capabilities

### New Capabilities
- `gov-procurement-intelligence`: Taiwan government procurement and tender data integration for B2G listed companies, providing order backlog metrics, win rate analytics, agency concentration, competitor head-to-head records, forward procurement forecasts, and Article 101 debarment compliance auditing.

### Modified Capabilities
(none)

## Impact

- **Frontend Components**: New `<GovBidsCard />` component adhering to the Card Positioning Policy (always above textual explanations) and responsive theme standards.
- **Backend / Actions**: New tool `showGovProcurement` in `lib/chat/actions.tsx` and routing rules in `lib/chat/routing.ts`.
- **External Integration**: Direct JSON-RPC / MCP client calls to `https://api.tobid.tw/mcp` without storing sensitive credentials or requiring API keys.
- **Security & Reliability**: SSRF-safe URL validation, 3-5s timeout protection, and graceful degradation ensuring chat flow is uninterrupted on API failure.
