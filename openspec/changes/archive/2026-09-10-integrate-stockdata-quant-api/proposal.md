## Why

`stockdata.david888.com` 已提供 LSTM、TimesFM、玄鐵策略、多策略共振、全市場批次快照、宏觀風控、法人排行與券商分點等量化服務；目前 Stockbot 主要依賴本地 TypeScript 引擎與個股卡片，無法呈現外部模型產出的全市場訊號與主力分點。建立一個有型別、可容錯、分階段推進的 API 整合層，能擴充 Stockbot 的量化研究深度與廣度，並嚴格杜絕假數據與工具意圖衝突。

## What Changes

- **三階段遞進落地策略**：
  - **Phase 1（核心量化預測）**：建立 `stockdata.david888.com` REST API 基礎用戶端，接入 LSTM、TimesFM、玄鐵趨勢回調、共振 endpoint 回傳的策略標籤、最新批次快照、代號解析與預測歷史軌跡。
  - **Phase 2（主力分點、籌碼排行與公司資料）**：接入券商主力進出 summary/trades/trend、全市場三大法人買賣超排行、結構化公司簡介、即時新聞與批次 profiles。
  - **Phase 3（宏觀風險與預測市場）**：接入市場宏觀風險 regime、建議投資曝險比例（Exposure %）、FedWatch、企業財報日曆、商品摘要、外部經濟日曆與 Polymarket 預測市場情緒。
- **嚴格工具意圖分工與路由防衝突**：
  - 個股官方三大法人籌碼（TWSE/TPEX 張數與土洋標籤）維持既有 `showInstitutionalFlow`。
  - 券商主力分點進出（買超/賣超分點排行）由新工具 `showStockBrokerBranches` 處理。
  - 全市場三大法人買賣超排行（非單一個股）由新工具 `showMarketInstitutionalLeaderboard` 處理。
  - 總經日曆維持既有 Investing.com 整合；宏觀曝險與風控由 `showMacroRiskRegime` 處理。
- **Vercel Serverless 與 Token 預算防護**：
  - 用戶端實施回應截斷與資料邊界（陣列上限 10-15 筆），防止巨量 JSON 塞爆對話上下文與拖慢 Server Action TTFT。
- **卡片與儲存規範**：
  - 所有卡片渲染於伴隨說明文字上方（Card Positioning Policy: 伴隨詞使用「以上是...」）。
  - 純 JSON 序列化存入 `localStorage`，不嵌套第二層 RSC 串流。
  - 外部 API 欄位為空或失敗時顯示 `—` 或明確狀態，禁止使用展示用假預設值。
- **Discovery / MCP 邊界解耦**：
  - 第一階段僅使用標準 REST API，MCP SSE / WebMCP 降級為選配診斷項目，不進入核心使用者渲染路徑。

## Capabilities

### New Capabilities

- `stockdata-api-client`: 外部 API 的設定、型別、驗證、重試、快取、熔斷、資料截斷與來源 metadata。
- `stockdata-predictions`: LSTM、TimesFM、玄鐵策略、共振推薦、Top Picks、批次快照、預測歷史與代號解析（Phase 1 核心）。
- `stockdata-market-intelligence`: 券商分點主力買賣、全市場三大法人排行、結構化公司簡介與即時新聞（Phase 2）。
- `stockdata-macro-intelligence`: 市場宏觀 regime、建議曝險比例、FedWatch、企業財報日曆、商品摘要、經濟日曆與 Polymarket 總經情緒（Phase 3）。
- `stockdata-agent-discovery`: OpenAPI 與 Agent discovery 資訊的診斷與選配邊界（延後/非阻塞）。

### Modified Capabilities

- None. Existing local quantitative capability contracts remain valid; this change adds an external provider and new capabilities rather than changing their required behavior.

## Impact

- Affected application areas: `lib/chat/actions.tsx`, `lib/chat/routing.ts`, `lib/chat-history.tsx`, new `lib/stockdata/*` adapter modules, new stockdata cards, and `public/llms*.txt` documentation.
- New configuration: a non-secret `STOCKDATA_BASE_URL` with optional API authentication/rate-limit settings. Credentials must remain server-side environment-only.
- New external dependency: REST endpoints documented by `https://stockdata.david888.com/llms.txt`, with OpenAPI 3.1 schema as reference.
- Runtime concerns: upstream latency, rate limits, stale batches, partial responses, and Vercel Serverless 60s timeout budget.
- No database migration is required; serialized tool results must remain JSON-safe for existing localStorage chat history.
