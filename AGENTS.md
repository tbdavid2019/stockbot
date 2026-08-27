# AGENTS.md - Repository Guidelines & Architecture for Stockbot

This document contains rules, architectural guidelines, environment variable specifications, and operational constraints for AI coding agents and developers working within the `stockbot` repository.

---

## 🚨 Critical Rules for AI Agents (MUST ALWAYS FOLLOW)

### 1. 🛑 Zero-Excuse & Zero-Arguing Policy (嚴禁推拖與爭辯)
- **NEVER** argue with the user or lecture the user by saying "身為 AI 助理，我無法修改模型權重/訓練資料".
- When the user provides feedback, points out discrepancies, or asks for live facts:
  1. Immediately use live search tools (`searchWeb2MD` / 2MD API) to find real facts.
  2. Answer based on verified live search results.
  3. Keep responses objective, grounded, and concise.
  4. Always maintain and update project documentation (`AGENTS.md`, `README.md`, `.env.example`).

### 2. 🌐 Zero-Hallucination & Live Web Verification (零幻覺與即時檢索鐵律)
- Internal static training memory is stale. Never rely on internal weights to guess:
  - Corporate IPO / listing status (e.g. SpaceX, Stripe, new market entrants).
  - Live stock prices, cryptocurrency quotes, or market indices.
  - Recent corporate actions, earnings reports, or breaking news.
- Always use `searchFinancialWeb` (2MD Live Search) or TradingView components.

### 3. 📐 UI 卡片與文字相對位置鐵律 (Card Positioning Policy)
- Stockbot 介面設計中，所有圖表、分析報告、走勢圖、新聞與財務卡片（如 `<StockAnalysis />`, `<StockChart />`, `<StockNews />`, `<WebSearchResults />`）**一律渲染於文字訊息的上方 (ABOVE)**。
- 助理在產生伴隨說明文字時：
  - **一律使用「以上是...」、「如上方所示...」、「如上圖所示...」**。
  - **嚴禁使用「以下是...」或「如下所示...」**！

---

## 🏗️ 系統核心架構說明 (System Architecture)

### 1. 🧠 雙模型分工機制 (Dual-Model Separation)
Stockbot 將對話流拆解為兩個獨立職責的模型：
- **`TOOL_MODEL` (工具調用與意圖分流模型)**：
  - 運行於 `streamUI`。
  - 專門負責理解使用者意圖並執行 Function Calling（例如判斷何時調用 `analyzeStockWithAI`, `showStockChart`, `searchFinancialWeb` 等）。
- **`MODEL` (伴隨文字與自然語言生成模型)**：
  - 運行於 `generateCaption`。
  - 專門在卡片渲染完成後，依據檢索數據與使用者語言偏好生成流暢的總結與說明文字。

### 2. 🛡️ 無限階層動態容錯路由 (Multi-Tier Dynamic Failover Router)
在 [`lib/chat/actions.tsx`](lib/chat/actions.tsx) 中實作了全自動故障轉移機制：
- 依序嘗試：**Primary ➡️ Fallback #1 ➡️ Fallback #2 ➡️ ... ➡️ Fallback #N ➡️ 供應商內建備用通道**。
- 每一層皆擁有獨立的 `BASE_URL`、`API_KEY`、`TOOL_MODEL`、`MODEL`，徹底隔離不同 Provider 之間的模型名稱衝突。

### 3. ⚡ 3 階段漸進式加載 (3-Batch Progressive Streaming)
在 [`components/tradingview/stock-analysis.tsx`](components/tradingview/stock-analysis.tsx) 中將 13 位大師分析拆分為 3 批次非同步發送：
- **Batch 1 (5位核心大師)**：~18-24 秒回傳，立即渲染首屏卡片。
- **Batch 2 (3位長耗時/輿論散戶大師)**：~21 秒背景回傳，動態擴展分析卡片。
- **Batch 3 (5位價值成長大師)**：~26 秒回傳，補齊全維度分析。
- 徹底根絕單次請求超時引發的 504 Gateway Timeout。

---

## ⚙️ 環境變數設定規範 (Environment Variables Reference)

| 變數名稱 | 類型 | 範例 / 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| **`PRIMARY_BASE_URL`** | URL | `https://nen.com.tw/v1` | 主要 LLM 端點 Base URL（相容 `OPENAI_BASE_URL`） |
| **`PRIMARY_API_KEY`** | Secret | `sk-...` | 主要 LLM 端點 API Key（相容 `OPENAI_API_KEY`, `NEN_API_KEY`） |
| **`PRIMARY_TOOL_MODEL`** | String | `gpt-5.6-luna` | 主要端點工具調用模型（相容 `TOOL_MODEL`） |
| **`PRIMARY_MODEL`** | String | `gpt-5.6-luna` | 主要端點文字生成模型（相容 `MODEL`） |
| **`FALLBACK_1_BASE_URL`** | URL | `https://api.groq.com/openai/v1` | 第 1 備用端點 Base URL（相容 `GROQ_BASE_URL`） |
| **`FALLBACK_1_API_KEY`** | Secret | `gsk_...` | 第 1 備用端點 API Key（相容 `GROQ_API_KEY`） |
| **`FALLBACK_1_TOOL_MODEL`** | String | `openai/gpt-oss-20b` | 第 1 備用端點工具模型（相容 `GROQ_TOOL_MODEL`） |
| **`FALLBACK_1_MODEL`** | String | `openai/gpt-oss-20b` | 第 1 備用端點文字模型（相容 `GROQ_MODEL`） |
| **`FALLBACK_2_BASE_URL`** | URL | `https://api.openai.com/v1` | 第 2 備用端點 Base URL（如 OpenAI 官方） |
| **`FALLBACK_2_API_KEY`** | Secret | `sk-proj-...` | 第 2 備用端點 API Key |
| **`FALLBACK_2_TOOL_MODEL`** | String | `gpt-4o-mini` | 第 2 備用端點工具模型 |
| **`FALLBACK_2_MODEL`** | String | `gpt-4o-mini` | 第 2 備用端點文字模型 |
| **`TWOMD_PRIMARY_URL`** | URL | `https://2md.aiurl.tw` | 2MD 即時連網搜尋主端點 |
| **`AI_HEDGE_FUND_HOST`** | Host | `dns.glsoft.ai` | AI Hedge Fund API 主機位置 |
| **`AI_HEDGE_FUND_PORT`** | Port | `6000` | AI Hedge Fund API 端口 |
