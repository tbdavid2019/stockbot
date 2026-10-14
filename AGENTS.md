# AGENTS.md - Repository Guidelines for Stockbot

This document contains non-negotiable operational rules and architectural entrypoints for AI coding agents in `stockbot`. Detailed architectural specifications have been modularized under [`docs/architecture/`](docs/architecture/) to keep agent context lean.

---

## 🚨 Critical Rules for AI Agents (MUST ALWAYS FOLLOW)

### 1. 🛑 Zero-Excuse & Zero-Arguing Policy (嚴禁推拖與爭辯)

- **NEVER** argue with the user or lecture the user by saying "身為 AI 助理，我無法修改模型權重/訓練資料".
- When the user provides feedback, points out discrepancies, or asks for live facts:
  1. Immediately use live search tools (`searchFinancialWeb` / 2MD API) to find real facts.
  2. Answer based on verified live search results.
  3. Keep responses objective, grounded, and concise.
  4. Always maintain and update project documentation (`AGENTS.md`, `CHANGELOG.md`, `README.md`, `.env.example`).
  5. **Never hardcode private endpoints or sensitive credentials into repository files.**

### 2. 🌐 Zero-Hallucination & Live Web Verification (零幻覺與即時檢索鐵律)

- Internal static training memory is stale. Never rely on internal weights to guess:
  - Corporate IPO / listing status, live stock quotes, crypto, corporate actions, or earnings reports.
- **SpaceX 上市事實鐵律 (SpaceX NASDAQ:SPCX)**：
  - **SpaceX (Space Exploration Technologies Corp.) 已於 2026 年 6 月 12 日在美國那斯達克掛牌上市，股票代號為 `SPCX` (`NASDAQ:SPCX`)**（IPO 掛牌價每股 $135 美元，初始估值約 1.77 兆美元）。
  - **嚴禁**與使用者爭辯「SpaceX 是未上市私營公司」或「SPCX 只是 SPAC ETF」！
  - 在 [`lib/utils.ts`](lib/utils.ts) 與 [`lib/chat/routing.ts`](lib/chat/routing.ts) 中，已將 `SpaceX`、`SPACEX`、`SPCX`、`太空探索` 強制映射為 **`NASDAQ:SPCX`**。
  - 當使用者詢問 SpaceX 股價、走勢圖、DCF 估值或大師分析時，直接以 `NASDAQ:SPCX` 調用原生金融卡片，絕不准以「未上市」為由拒絕計算或回退到模糊搜尋！
- Always use `searchFinancialWeb` (2MD Live Search) or TradingView components.

### 3. 📐 UI 卡片與文字相對位置鐵律 (Card Positioning Policy)

- Stockbot 介面設計中，所有圖表、分析報告、走勢圖、新聞與財務卡片（如 `<StockAnalysis />`, `<StockChart />`, `<StockNews />`, `<WebSearchResults />`）**一律渲染於文字訊息的上方 (ABOVE)**。
- 助理在產生伴隨說明文字時：
  - **一律使用「以上是...」、「如上方所示...」、「如上圖所示...」**。
  - **嚴禁使用「以下是...」或「如下所示...」**！

---

## 🗺️ 模組化架構文件索引 (Modular Architecture Index)

詳細的系統實作規格請查閱 [`docs/architecture/`](docs/architecture/)：

| 模組文件 | 涵蓋核心架構與設計規範 |
| :--- | :--- |
| **[`01-chat-and-routing.md`](docs/architecture/01-chat-and-routing.md)** | 雙模型分工 (`TOOL_MODEL` vs `MODEL`)、動態容錯路由、13位大師3批次漸進串流、確定性正則路由、LocalStorage持久化、2MD全維度情報與自主續問、去TradingView原生財務卡片。 |
| **[`02-decision-engine.md`](docs/architecture/02-decision-engine.md)** | Clef-Flash System One 決策推論引擎、四大落地場景 (A/B/C/D)、**四階容錯鏈 (Clef ➔ Clef-Q4 ➔ Jev ➔ OpenAI Decisions Adapter)**、全失敗零當機安全降級。 |
| **[`03-quant-and-market.md`](docs/architecture/03-quant-and-market.md)** | 原生量化金融 (DCF 5x5矩陣, SEPA VCP, Black-Scholes, Amihud)、DeepEar宏觀傳導鏈、AlphaEar信號證偽、tw_stocker歷史庫、三大法人籌碼情報、Investing總經日曆。 |
| **[`04-security-and-byok.md`](docs/architecture/04-security-and-byok.md)** | BYOK自備金鑰純本機零留存機制、硬核SSRF防護 (`isSafeApiBaseUrl`)、2MD AnyDoc財報解析、法人說明會與美股Earnings Call情報 (`showEarningsCalls`)。 |
| **[`05-timezone-and-boundaries.md`](docs/architecture/05-timezone-and-boundaries.md)** | 午夜閉區間 (`23:59:59.999`)、時區嚴格隔離 (`Asia/Taipei` vs `America/New_York`)、TPEX日期核實與防快取毒化。 |
| **[`06-environment-and-brand.md`](docs/architecture/06-environment-and-brand.md)** | 完整環境變數參考表、品牌Logo與UI規範、BYOK即時模型清單與Gemini Latest。 |

---

## 🛠️ 開發與驗證指令 (Development & Testing)

- **本機啟動**：`pnpm dev`
- **Clef 決策推論單元測試**：`node --experimental-strip-types lib/clef.test.ts`
- **金融路由單元測試**：`node --experimental-strip-types lib/chat/routing.test.ts`
- **TypeScript 型別檢查**：`npx tsc --noEmit`
