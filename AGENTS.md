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

### 4. 🔄 確定性工具路由與多輪上下文 (Deterministic Tool Routing)

- 明確包含 ticker 的股價、圖表、財務、新聞與大師分析請求，由 [`lib/chat/routing.ts`](lib/chat/routing.ts) 強制選擇對應工具，避免弱模型誤選 2MD 搜尋。
- 明確 ticker 搭配任何財報科目、會計用語、比率、成長比較或估值倍數時，優先使用 `answerFinancialMetric`；確定性路由辨識通用語義形狀，未涵蓋的新術語仍由 `TOOL_MODEL` 判斷，不維護無限增長的硬編碼指標清單。
- 未包含 ticker 的未知公司名稱才交由 `searchFinancialWeb` 查證；後續追問會從 AI State 的最近工具參數繼承標的。
- 目前使用的 AI SDK `streamUI` 每次 Server Action 執行一個主要工具；跨工具研究流程透過多輪對話與續問按鈕銜接，不宣稱不存在的單次 15-step 執行。
- **`publishToDavid888Wiki`**：串接 `https://wiki.david888.com/api`，產出 Markdown 深度報告並自動回傳 `shareUrl`、`/present` 簡報與 `/book` 電子書。
- **`readWebPage`**：透過 2MD Web Reader 萃取線上新聞/網址全文。

### 5. 📜 對話歷史紀錄與 LocalStorage 持久化架構 (Chat History & LocalStorage Persistence)

- **零後端純本機存儲**：透過 [`lib/chat-history.tsx`](lib/chat-history.tsx) 將所有對話（包含文字、TradingView 走勢圖、即時報價、大師 AI 分析、2MD 搜尋、Wiki 發布結果）持久化於瀏覽器 `localStorage` (`stockbot_chat_sessions_v1`)。
- **全組件 UI State 還原機制 (`createUIStateFromStoredMessages`)**：
  - 將序列化對話與工具呼叫結果還原為原生 React Financial Cards，並保留 AI 對話上下文。
  - 工具調用均在 `aiState.done` 前保存可序列化的純文字結果；卡片不再嵌套第二層 RSC stream，避免 Vercel `Connection closed.`。
  - `app/(chat)/page.tsx` 與 `app/(chat)/chat/[id]/page.tsx` 必須各自匯出 `maxDuration = 60`；只在 layout 宣告不會套用到 Vercel Server Action。
  - 一般金融卡的即時資料由卡片/API 自行載入；Server Action 內禁止為一般 caption 先用 2MD 預抓同一份資料。一般 Caption 僅允許單一 provider、1.5 秒上限，失敗即使用本機 fallback。
  - `answerFinancialMetric` 與 2MD 研究屬於使用者要求的主要答案，不是一般 caption；可在 60 秒 Server Action 預算內使用最多兩個 provider、每個 7 秒的證據合成。13 位大師綜合判讀則由 `/api/analysis-summary` 在卡片資料完成後獨立執行。
  - `streamUI` 每輪僅使用一個工具 provider。禁止將短時限 `AbortSignal` 直接傳入 `streamUI`：AI SDK 的串流可能在函式返回後才拋出 timeout，造成未捕捉的 RSC render exception；執行時間由 page entry 的 `maxDuration = 60` 收斂。
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
  - 回答正文與續問生成必須解耦。正文完成後，由 [`lib/chat/followup-context.ts`](lib/chat/followup-context.ts) 讀取最近使用者問題、純文字回答、工具呼叫參數、工具結果與保存的 caption，再生成 2 ~ 4 個承接當前標的與資料缺口的續問。
  - `answerFinancialMetric` 的結構化 direct answer、研究工具、一般金融卡與不呼叫工具的純文字回答都必須保留續問；不得依輪數停用，也不得只處理前兩輪。
  - `---SUGGESTIONS---` 僅作為歷史紀錄與 UI 的序列化邊界。解析、清理、去重與邀請句過濾集中於 [`lib/followup-suggestions.ts`](lib/followup-suggestions.ts)，禁止在多個 React 組件各自複製 parser。
  - 禁止在 prompt 或 fallback 寫死台積電、統一、Apple 等公司範例。Provider 失敗時，只能使用本輪實際 symbol/company、問題、工具意圖與已取得資料衍生續問；上下文不足時寧可少而準。
  - 前端組件 [`components/stocks/followup-prompts.tsx`](components/stocks/followup-prompts.tsx) 使用低干擾文字連結呈現；點擊後仍走正常 `submitUserMessage`，支援連續多輪追問。

### 8. 🛡️ 去 TradingView 依賴與原生財務/新聞卡片架構 (Native Financials & Resilient Cards)

- 鑑於 TradingView 免費 Widget 對非美股（如台股 2330/1216、港股 1810/700 等）支援有限，常發生「不支援此標的」或空白問題。
- 系統已全面升級為原生 React 金融情報卡片：
  - **`showStockFinancials` ➔ `<NativeFinancialsCard />`**：串接量化分析 API 的結構化指標（P/E, P/B, P/S, ROE, 淨利率, 營業利益率, 流動比, 負債比, 營收年增率, DCF 內在價值）；實際可用欄位依上游市場與標的覆蓋為準。
  - **`answerFinancialMetric` ➔ `<FinancialMetricCard />` + `<BotCaption />`**：即時搜尋僅作為後端證據；上方卡片呈現來源，下方文字直接回答指標、財報期間、幣別與 reported/adjusted/estimate 口徑；不能核實時明確拒絕猜值。
  - `answerFinancialMetric` 優先透過 [`lib/financial-fundamentals.ts`](lib/financial-fundamentals.ts) 讀取 Yahoo Finance Fundamentals 的年度、季度與 TTM 結構化序列。精準科目直接計算最新季度、同比、TTM、完整年度與 CAGR；結構化來源無資料時才退回 2MD 證據搜尋與 LLM 合成。
  - `answerFinancialMetric` 同時處理「最新財務數據與估值」等多指標摘要。台股代號先由 AnswerBook Market Data 解析公司名，再以公司名、純代號與財務意圖執行多查詢 2MD 搜尋；禁止直接把 `TWSE:` 前綴、emoji 或整句 UI 樣板當成唯一 query。
  - 續問建議只能是可直接執行的研究問題；禁止輸出「有興趣嗎」、「想深入了解嗎」或 `Would you like...` 等把決策丟回使用者的邀請式句子。
  - **禁止假財務預設值**：上游未提供的指標一律顯示 `—` 或「待確認」，不得用展示用數字或固定判斷取代真實資料。
  - **`showStockNews` ➔ `<NativeStockNewsCard />`**：由 2MD 全網情報大腦即時檢索最新重大快訊、法說會動態與新聞外鏈，無任何交易所限制。
  - **全局錯誤邊界 (`SafeCardErrorBoundary`)**：所有訊息與卡片均包裹安全邊界，單一異常絕不拖垮整場對話。

### 9. 📐 原生量化金融分析 (Native Quantitative Finance)

- `lib/quant/valuation.ts` 提供 5 年 FCFF DCF、CAPM/WACC、同業 P/E、EV/EBITDA、EV/Sales 與 WACC × 終值成長率 5×5 敏感度矩陣；缺少 beta 時使用明確標示的產業預設，負 EBITDA 時不使用無效 EV/EBITDA。
- `lib/quant/sepa.ts` 提供 Minervini 八項 Trend Template、Stage 1–4、VCP 型態與風險式部位大小；`lib/quant/black-scholes.ts` 提供多腿策略、Greeks 與到期/理論損益曲線。
- `lib/quant/microstructure.ts` 提供 Amihud、年化 float turnover、平方根市場衝擊與 ETF NAV divergence。上游缺少資料時卡片顯示 `—` 或「待確認」，禁止使用展示用財務數字。
- 新工具透過 `lib/chat/routing.ts` 確定性路由至 `lib/chat/actions.tsx`，並由 `lib/chat-history.tsx` 以純 JSON 結果還原；所有量化卡片必須渲染在伴隨 caption 上方。

### 10. ⛓️ DeepEar 宏觀邏輯傳導鏈與 AlphaEar 訊號證偽機制 (Transmission Chains & Signal Tracking)

- **`showTransmissionChain` ➔ `<TransmissionChainCard />`**：串接 `https://deepear.vercel.app/latest.json` 與因果傳導引擎，分析「一階總經/事件觸發 ➔ 二階產業鏈傳導 ➔ 三階企業獲利兌現」多層級連鎖反應，包含利好/利空/中性衝擊標籤與情緒/信心度打分。
- **`trackInvestmentSignal` ➔ `<SignalTrackerCard />`**：實作 4 態投資假說演化（🟢 **Strengthened** / 🟡 **Weakened** / 🔴 **Falsified** / ⚪ **Unchanged**），並嚴格列出 **核心論點證偽判定點 (Falsification Triggers)**，提供動態部位調整指引。
- 支援透過 `lib/chat/routing.ts` 確定性路由與對話上下文標的繼承，並以純 JSON 持久化至瀏覽器 `localStorage`。

---

## ⚙️ 環境變數設定規範 (Environment Variables Reference)

| 變數名稱                    | 類型   | 範例 / 預設值                                              | 說明                                               |
| :-------------------------- | :----- | :--------------------------------------------------------- | :------------------------------------------------- |
| **`PRIMARY_BASE_URL`**      | URL    | `https://api.openai.com/v1`                                | 主要 LLM 端點 Base URL（相容 `OPENAI_BASE_URL`）   |
| **`PRIMARY_API_KEY`**       | Secret | `sk-proj-...`                                              | 主要 LLM 端點 API Key（相容 `OPENAI_API_KEY`）     |
| **`PRIMARY_TOOL_MODEL`**    | String | `gpt-4o-mini`                                              | 主要端點工具調用模型（相容 `TOOL_MODEL`）          |
| **`PRIMARY_MODEL`**         | String | `gpt-4o-mini`                                              | 主要端點文字生成模型（相容 `MODEL`）               |
| **`FALLBACK_1_BASE_URL`**   | URL    | `https://api.groq.com/openai/v1`                           | 第 1 備用端點 Base URL（相容 `GROQ_BASE_URL`）     |
| **`FALLBACK_1_API_KEY`**    | Secret | `gsk_...`                                                  | 第 1 備用端點 API Key（相容 `GROQ_API_KEY`）       |
| **`FALLBACK_1_TOOL_MODEL`** | String | `openai/gpt-oss-20b`                                       | 第 1 備用端點工具模型（相容 `GROQ_TOOL_MODEL`）    |
| **`FALLBACK_1_MODEL`**      | String | `openai/gpt-oss-20b`                                       | 第 1 備用端點文字模型（相容 `GROQ_MODEL`）         |
| **`FALLBACK_2_BASE_URL`**   | URL    | `https://generativelanguage.googleapis.com/v1beta/openai/` | 第 2 備用端點 Base URL（如 Google Gemini / Azure） |
| **`FALLBACK_2_API_KEY`**    | Secret | `AIza...`                                                  | 第 2 備用端點 API Key（如 `GEMINI_API_KEY`）       |
| **`FALLBACK_2_TOOL_MODEL`** | String | `gemini-2.5-flash`                                         | 第 2 備用端點工具模型                              |
| **`FALLBACK_2_MODEL`**      | String | `gemini-2.5-flash`                                         | 第 2 備用端點文字模型                              |
| **`TWOMD_PRIMARY_URL`**     | URL    | `https://2md.aiurl.tw`                                     | 2MD 即時連網搜尋主端點                             |
| **`AI_HEDGE_FUND_HOST`**    | Host   | `dns.glsoft.ai`                                            | AI Hedge Fund API 主機位置                         |
| **`AI_HEDGE_FUND_PORT`**    | Port   | `6000`                                                     | AI Hedge Fund API 端口                             |
