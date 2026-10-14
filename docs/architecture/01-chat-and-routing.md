# 01. 對話流與工具路由架構 (Chat & Routing Architecture)

## 1. 🧠 雙模型分工機制 (Dual-Model Separation)

Stockbot 將對話流拆解為兩個獨立職責的模型：

- **`TOOL_MODEL` (工具調用與意圖分流模型)**：
  - 運行於 `streamUI`。
  - 專門負責理解使用者意圖並執行 Function Calling（例如判斷何時調用 `analyzeStockWithAI`, `showStockChart`, `searchFinancialWeb` 等）。
- **`MODEL` (伴隨文字與自然語言生成模型)**：
  - 運行於 `generateCaption`。
  - 專門在卡片渲染完成後，依據檢索數據與使用者語言偏好生成流暢的總結與說明文字。

---

## 2. 🛡️ 無限階層動態容錯路由 (Multi-Tier Dynamic Failover Router)

在 [`lib/chat/actions.tsx`](../../lib/chat/actions.tsx) 中實作了全自動故障轉移機制：

- 支援任意公有雲（OpenAI、Azure OpenAI、Google Gemini、Groq、DeepSeek 等）。
- 依序嘗試：**Primary ➡️ Fallback #1 ➡️ Fallback #2 ➡️ ... ➡️ Fallback #N**。
- 每一層皆擁有獨立的 `BASE_URL`、`API_KEY`、`TOOL_MODEL`、`MODEL`，徹底隔離不同 Provider 之間的模型名稱衝突。

---

## 3. ⚡ 3 階段漸進式加載 (3-Batch Progressive Streaming)

在 [`components/tradingview/stock-analysis.tsx`](../../components/tradingview/stock-analysis.tsx) 中將 13 位大師分析拆分為 3 批次非同步發送：

- **Batch 1 (5位核心大師)**：~18-24 秒回傳，立即渲染首屏卡片。
- **Batch 2 (3位長耗時/輿論散戶大師)**：~21 秒背景回傳，動態擴展分析卡片。
- **Batch 3 (5位價值成長大師)**：~26 秒回傳，補齊全維度分析。
- 徹底根絕單次請求超時引發的 504 Gateway Timeout。

---

## 4. 🔄 確定性工具路由與多輪上下文 (Deterministic Tool Routing)

- 明確包含 ticker 的股價、圖表、財務、新聞與大師分析請求，由 [`lib/chat/routing.ts`](../../lib/chat/routing.ts) 強制選擇對應工具，避免弱模型誤選 2MD 搜尋。
- 明確 ticker 搭配任何財報科目、會計用語、比率、成長比較或估值倍數時，優先使用 `answerFinancialMetric`；確定性路由辨識通用語義形狀，未涵蓋的新術語仍由 `TOOL_MODEL` 判斷，不維護無限增長的硬編碼指標清單。
- 未包含 ticker 的未知公司名稱才交由 `searchFinancialWeb` 查證；後續追問會從 AI State 的最近工具參數繼承標的。
- 目前使用的 AI SDK `streamUI` 每次 Server Action 執行一個主要工具；跨工具研究流程透過多輪對話與續問按鈕銜接，不宣稱不存在的單次 15-step 執行。
- **`publishToDavid888Wiki`**：串接 `https://wiki.david888.com/api`，產出 Markdown 深度報告並自動回傳 `shareUrl`、`/present` 簡報與 `/book` 電子書。
- **`readWebPage`**：透過 2MD Web Reader 萃取線上新聞/網址全文。

---

## 5. 📜 對話歷史紀錄與 LocalStorage 持久化架構 (Chat History & LocalStorage Persistence)

- **零後端純本機存儲**：透過 [`lib/chat-history.tsx`](../../lib/chat-history.tsx) 將所有對話（包含文字、TradingView 走勢圖、即時報價、大師 AI 分析、2MD 搜尋、Wiki 發布結果）持久化於瀏覽器 `localStorage` (`stockbot_chat_sessions_v1`)。
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

---

## 6. 💡 2MD 全維度金融情報大腦與互動式自主續問 (Universal Intelligence & Follow-ups)

- **2MD 全維度情報多路並發檢索 (`fetchLiveFinancialIntelligence`)**：
  - 各金融工具與走勢圖調用時，自動並發檢索：(1) 即時成交價與估值指標、(2) 相關概念股與供應鏈上下游、(3) 美債 10 年殖利率/降息循環/總經環境、(4) 最新突發新聞與三大法人買賣超籌碼。
  - 徹底解決單一標的資訊受限或過往空泛回覆，提供機構級全維度研調視野。
- **自主續問提示組件 (`FollowupPrompts` & `BotCaption`)**：
  - 回答正文與續問生成必須解耦。正文完成後，由 [`lib/chat/followup-context.ts`](../../lib/chat/followup-context.ts) 讀取最近使用者問題、純文字回答、工具呼叫參數、工具結果與保存的 caption，再生成 2 ~ 4 個承接當前標的與資料缺口的續問。
  - `answerFinancialMetric` 的結構化 direct answer、研究工具、一般金融卡與不呼叫工具的純文字回答都必須保留續問；不得依輪數停用，也不得只處理前兩輪。
  - `---SUGGESTIONS---` 僅作為歷史紀錄與 UI 的序列化邊界。解析、清理、去重與邀請句過濾集中於 [`lib/followup-suggestions.ts`](../../lib/followup-suggestions.ts)，禁止在多個 React 組件各自複製 parser。
  - 禁止在 prompt 或 fallback 寫死台積電、統一、Apple 等公司範例。Provider 失敗時，只能使用本輪實際 symbol/company、問題、工具意圖與已取得資料衍生續問；上下文不足時寧可少而準。
  - 前端組件 [`components/stocks/followup-prompts.tsx`](../../components/stocks/followup-prompts.tsx) 使用低干擾文字連結呈現；點擊後仍走正常 `submitUserMessage`，支援連續多輪追問。

---

## 7. 🛡️ 原生財務與新聞卡片架構 (Native Financials & Resilient Cards)

- 系統已全面升級為原生 React 金融情報卡片：
  - **`showStockFinancials` ➔ `<NativeFinancialsCard />`**：串接量化分析 API 的結構化指標（P/E, P/B, P/S, ROE, 淨利率, 營業利益率, 流動比, 負債比, 營收年增率, DCF 內在價值）；實際可用欄位依上游市場與標的覆蓋為準。
  - **`answerFinancialMetric` ➔ `<FinancialMetricCard />` + `<BotCaption />`**：即時搜尋僅作為後端證據；上方卡片呈現來源，下方文字直接回答指標、財報期間、幣別與 reported/adjusted/estimate 口徑；不能核實時明確拒絕猜值。
  - `answerFinancialMetric` 優先透過 [`lib/financial-fundamentals.ts`](../../lib/financial-fundamentals.ts) 讀取 Yahoo Finance Fundamentals 的年度、季度與 TTM 結構化序列。精準科目直接計算最新季度、同比、TTM、完整年度與 CAGR；結構化來源無資料時才退回 2MD 證據搜尋與 LLM 合成。
  - `answerFinancialMetric` 同時處理「最新財務數據與估值」等多指標摘要。台股代號先由 AnswerBook Market Data 解析公司名，再以公司名、純代號與財務意圖執行多查詢 2MD 搜尋；禁止直接把 `TWSE:` 前綴、emoji 或整句 UI 樣板當成唯一 query。
  - 續問建議只能是可直接執行的研究問題；禁止輸出「有興趣嗎」、「想深入了解嗎」或 `Would you like...` 等把決策丟回使用者的邀請式句子。
  - **禁止假財務預設值**：上游未提供的指標一律顯示 `—` 或「待確認」，不得用展示用數字或固定判斷取代真實資料。
  - **`showStockNews` ➔ `<NativeStockNewsCard />`**：由 2MD 全網情報大腦即時檢索最新重大快訊、法說會動態與新聞外鏈，無任何交易所限制。
  - **全局錯誤邊界 (`SafeCardErrorBoundary`)**：所有訊息與卡片均包裹安全邊界，單一異常絕不拖垮整場對話。
