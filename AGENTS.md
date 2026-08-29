# AGENTS.md - Repository Guidelines & Architecture for Stockbot

This document contains rules, architectural guidelines, environment variable specifications, and operational constraints for AI coding agents and developers working within the `stockbot` repository.

---

## 🚨 Critical Rules for AI Agents (MUST ALWAYS FOLLOW)

### 1. 🛑 Zero-Excuse & Zero-Arguing Policy (嚴禁推拖與爭辯)
- **NEVER** argue with the user or lecture the user by saying "身為 AI 助理，我無法修改模型權重/訓練資料".
- When the user provides feedback, points out discrepancies, or asks for live facts:
  1. Immediately use live search tools (`searchFinancialWeb` / 2MD API) to find real facts.
  2. Answer based on verified live search results.
  3. Keep responses objective, grounded, and concise.
  4. Always maintain and update project documentation (`AGENTS.md`, `README.md`, `.env.example`).
  5. **Never hardcode private endpoints or sensitive credentials into repository files.**

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
- 支援任意公有雲（OpenAI、Azure OpenAI、Google Gemini、Groq、DeepSeek 等）。
- 依序嘗試：**Primary ➡️ Fallback #1 ➡️ Fallback #2 ➡️ ... ➡️ Fallback #N**。
- 每一層皆擁有獨立的 `BASE_URL`、`API_KEY`、`TOOL_MODEL`、`MODEL`，徹底隔離不同 Provider 之間的模型名稱衝突。

### 3. ⚡ 3 階段漸進式加載 (3-Batch Progressive Streaming)
在 [`components/tradingview/stock-analysis.tsx`](components/tradingview/stock-analysis.tsx) 中將 13 位大師分析拆分為 3 批次非同步發送：
- **Batch 1 (5位核心大師)**：~18-24 秒回傳，立即渲染首屏卡片。
- **Batch 2 (3位長耗時/輿論散戶大師)**：~21 秒背景回傳，動態擴展分析卡片。
- **Batch 3 (5位價值成長大師)**：~26 秒回傳，補齊全維度分析。
- 徹底根絕單次請求超時引發的 504 Gateway Timeout。

### 4. 🔄 15 輪多步自主推理與發布執行器 (15-Round ReAct Loop & WikiPublisher)
- 支援最多 15 輪工具連續調用鏈（搜尋 ➔ 網頁深讀 ➔ 大師分析 ➔ 線圖呈現 ➔ 發布 Wiki 報告）。
- **`publishToDavid888Wiki`**：串接 `https://wiki.david888.com/api`，產出 Markdown 深度報告並自動回傳 `shareUrl`、`/present` 簡報與 `/book` 電子書。
- **`readWebPage`**：透過 2MD Web Reader 萃取線上新聞/網址全文。

### 5. 📜 對話歷史紀錄與 LocalStorage 持久化架構 (Chat History & LocalStorage Persistence)
- **零後端純本機存儲**：透過 [`lib/chat-history.tsx`](lib/chat-history.tsx) 將所有對話（包含文字、TradingView 走勢圖、即時報價、大師 AI 分析、2MD 搜尋、Wiki 發布結果）持久化於瀏覽器 `localStorage` (`stockbot_chat_sessions_v1`)。
- **全組件 UI State 還原機制 (`createUIStateFromStoredMessages`)**：
  - 將序列化對話與工具呼叫結果還原為原生 React Financial Cards，並保留 AI 對話上下文。
  - 13 個工具調用均在 `aiState.done` 前先生成 `caption` 並保存至 `result.caption`，保證歷史回顧時說明文字與圖表同步還原。
- **事件驅動架構 (Event-Driven Architecture)**：
  - `stockbot-chat-history-updated`：跨組件同步歷史紀錄更新。
  - `stockbot-select-chat`：即時切換指定歷史對話。
  - `stockbot-new-chat`：一鍵重置至全新空白對話。
### 6. 📑 2MD AnyDoc 財報/年報解析與多模態文件架構 (Financial Report & Document Parsing)
- **多端點 AnyDoc 容錯解析**：於 [`lib/2md.ts`](lib/2md.ts) 實作 `parseDocument2MD` 與 `readUrl2MD`，支援 PDF、Word (.docx)、Excel (.xlsx/.csv)、PPT、TXT。
- **自主財報工具 (`readFinancialReport`)**：當使用者提供線上財報/年報/SEC 10-K/10-Q 網址時，AI 自主抓取並結構化剖析三大財務報表（損益表、資產負債表、現金流量表）、計算毛利率/ROE/ROIC/自由現金流 (FCF)、評估管理層指引與風險因子。
- **本機文件上傳管道 (`/api/parse-document`)**：
  - 前端 [`components/prompt-form.tsx`](components/prompt-form.tsx) 提供 📎 檔案上傳按鈕，支援最大 25MB 文件秒級解析。
  - 解析後自動注入上下文並提供視覺化卡片 [`FinancialReportCard`](components/stocks/financial-report-card.tsx)。

### 7. 💡 2MD 全維度金融情報大腦與互動式自主續問架構 (Universal Financial Intelligence & Suggested Follow-ups)
- **2MD 全維度情報多路並發檢索 (`fetchLiveFinancialIntelligence`)**：
  - 各金融工具與走勢圖調用時，自動並發檢索：(1) 即時成交價與估值指標、(2) 相關概念股與供應鏈上下游、(3) 美債 10 年殖利率/降息循環/總經環境、(4) 最新突發新聞與三大法人買賣超籌碼。
  - 徹底解決單一標的資訊受限或過往空泛回覆，提供機構級全維度研調視野。
- **自主續問提示組件 (`FollowupPrompts` & `BotCaption`)**：
  - AI 解說在結尾以 `---SUGGESTIONS---` 產生 3 ~ 4 個跨維度（概念股供應鏈、總經美債、季報解讀、大師分析）量身定制的自主續問建議。
  - 前端組件 [`components/stocks/followup-prompts.tsx`](components/stocks/followup-prompts.tsx) 自動將其渲染為高質感互動按鈕，使用者點擊即可觸發無縫追問。

---

## ⚙️ 環境變數設定規範 (Environment Variables Reference)

| 變數名稱 | 類型 | 範例 / 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| **`PRIMARY_BASE_URL`** | URL | `https://api.openai.com/v1` | 主要 LLM 端點 Base URL（相容 `OPENAI_BASE_URL`） |
| **`PRIMARY_API_KEY`** | Secret | `sk-proj-...` | 主要 LLM 端點 API Key（相容 `OPENAI_API_KEY`） |
| **`PRIMARY_TOOL_MODEL`** | String | `gpt-4o-mini` | 主要端點工具調用模型（相容 `TOOL_MODEL`） |
| **`PRIMARY_MODEL`** | String | `gpt-4o-mini` | 主要端點文字生成模型（相容 `MODEL`） |
| **`FALLBACK_1_BASE_URL`** | URL | `https://api.groq.com/openai/v1` | 第 1 備用端點 Base URL（相容 `GROQ_BASE_URL`） |
| **`FALLBACK_1_API_KEY`** | Secret | `gsk_...` | 第 1 備用端點 API Key（相容 `GROQ_API_KEY`） |
| **`FALLBACK_1_TOOL_MODEL`** | String | `openai/gpt-oss-20b` | 第 1 備用端點工具模型（相容 `GROQ_TOOL_MODEL`） |
| **`FALLBACK_1_MODEL`** | String | `openai/gpt-oss-20b` | 第 1 備用端點文字模型（相容 `GROQ_MODEL`） |
| **`FALLBACK_2_BASE_URL`** | URL | `https://generativelanguage.googleapis.com/v1beta/openai/` | 第 2 備用端點 Base URL（如 Google Gemini / Azure） |
| **`FALLBACK_2_API_KEY`** | Secret | `AIza...` | 第 2 備用端點 API Key（如 `GEMINI_API_KEY`） |
| **`FALLBACK_2_TOOL_MODEL`** | String | `gemini-2.5-flash` | 第 2 備用端點工具模型 |
| **`FALLBACK_2_MODEL`** | String | `gemini-2.5-flash` | 第 2 備用端點文字模型 |
| **`TWOMD_PRIMARY_URL`** | URL | `https://2md.aiurl.tw` | 2MD 即時連網搜尋主端點 |
| **`AI_HEDGE_FUND_HOST`** | Host | `dns.glsoft.ai` | AI Hedge Fund API 主機位置 |
| **`AI_HEDGE_FUND_PORT`** | Port | `6000` | AI Hedge Fund API 端口 |
