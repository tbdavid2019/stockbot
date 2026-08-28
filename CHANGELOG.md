# 更新日誌 (CHANGELOG)

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式規範記錄各版本更新與功能演進。

---

## [2026-08-28] - 15 輪多輪自主工具循環、David888 WikiPublisher 自主發布器與 2MD Web Reader

### ✨ 新增 (Added)
- **15 輪多輪自主工具循環 (Autonomous 15-Round Multi-Step ReAct Loop)**：
  - 於 [`lib/chat/actions.tsx`](lib/chat/actions.tsx) 支援最多 15 輪多步自主工具調用與推理鏈，實現複雜調研：搜尋 ➔ 網頁深讀 ➔ 13 位大師分析 ➔ 線圖繪製 ➔ 自動產出並發布 Wiki 報告。
- **David888 WikiPublisher 自主發布器 (`publishToDavid888Wiki`)**：
  - 整合 [`https://wiki.david888.com/api`](lib/wiki.ts) REST API 與 `SKILL.md` 規範。
  - 當生成長篇研究報告、深度估值模型或投資備忘錄時，自動整理結構化 Markdown（含 `[TOC]`、數據表、Mermaid 流程圖、GitHub Alerts 與註腳）發布至 David888 Wiki。
  - 回傳公開分享網址 (`shareUrl`)、2D 簡報模式 (`/present`) 與雙欄電子書模式 (`/book`)，並渲染視覺化卡片 [`WikiPublishResultCard`](components/stocks/wiki-publish-result.tsx)。
- **2MD Web Reader 網頁全文深讀工具 (`readWebPage`)**：
  - 於 [`lib/2md.ts`](lib/2md.ts) 實作 `readUrl2MD`，支援將任意線上財經新聞、公告或網址轉換為乾淨 Markdown，供 LLM 深度研讀分析。

---

## [2026-08-27] - 無限階層動態容錯路由、雙模型職責分離、3 階段漸進式加載與 2MD 即時連網搜尋

### ✨ 新增 (Added)
- **無限階層動態容錯路由 (Multi-Tier Dynamic Failover Router)**：
  - 於 [`lib/chat/actions.tsx`](lib/chat/actions.tsx) 實作全自動故障轉移路由，支援依序輪替：**Primary ➡️ Fallback #1 ➡️ Fallback #2 ➡️ ... ➡️ Fallback #N**。
  - 支援三大公有雲與具名供應商原生接入（OpenAI、Google Gemini、Azure OpenAI、Groq、DeepSeek）。
  - 各階層皆擁有獨立的 `BASE_URL`、`API_KEY`、`TOOL_MODEL`、`MODEL`，徹底隔離不同 Provider 之間的模型名稱衝突。
- **雙模型分工機制 (Dual-Model Separation)**：
  - **`TOOL_MODEL`**：專職 `streamUI` 的 Function Calling、意圖識別與金融卡片調用。
  - **`MODEL`**：專職 `generateCaption` 的自然語言總結與繁體中文說明。
  - 支援各階層獨立配置（如 `PRIMARY_TOOL_MODEL`、`FALLBACK_1_TOOL_MODEL` 等）。
- **3 階段漸進式加載 (3-Batch Progressive Streaming)**：
  - 於 [`components/tradingview/stock-analysis.tsx`](components/tradingview/stock-analysis.tsx) 將 13 位大師分析拆分為 3 個非同步批次發送：
    - **Batch 1 (5位核心大師)**：~18-24 秒內回傳，第一時間渲染首屏卡片。
    - **Batch 2 (3位長耗時/輿論散戶大師)**：~21 秒背景回傳，動態擴展分析卡片。
    - **Batch 3 (5位價值成長大師)**：~26 秒回傳，補齊 13 位大師全維度分析。
  - 徹底根絕單次請求超時引發的 Vercel 504 Gateway Timeout。
- **動態每日標的跑馬燈 (Dynamic Ticker Tape with stock.david888.com)**：
  - 於 [`components/tradingview/ticker-tape.tsx`](components/tradingview/ticker-tape.tsx) 串接 `/api/dynamic-prompts`，每日自動抓取 `stock.david888.com` 最新台股（TW50 / 台灣中型100）與美股（S&P 500）精選標的。
  - 動態組裝 TradingView 股票代碼格式（如 `TWSE:2330`、`NASDAQ:NVDA`、`NYSE:BRK.B`），並原生適配 Dark / Light 主題切換。
- **2MD 即時連網搜尋工具 (`searchFinancialWeb`)**：
  - 整合 2MD 搜尋引擎 API（[`lib/2md.ts`](lib/2md.ts)），支援最新財經新聞、公司 IPO/上市狀態、股票代號查找與即時事件檢索。
  - 新增搜尋結果視覺化卡片組件 [`WebSearchResults`](components/stocks/web-search-results.tsx)，提供標題、摘要來源與原文跳轉超連結。
- **零幻覺與即時檢索鐵律 (Zero-Hallucination Policy)**：
  - 在 System Prompt 中加入嚴格檢索規範，嚴禁底層模型憑過期知識臆測公司上市狀態、假日期、假新聞或假數字；面對「SpaceX 股價」等時效性標的強制調用 `searchFinancialWeb`。
  - 在解說生成階段 (`generateCaption`) 注入即時檢索數據上下文 (`contextData`)，防止底層 LLM 二次生成文字時與檢索結果衝突。
- **UI 卡片相對位置鐵律 (Card Positioning Directive)**：
  - 所有圖表與分析卡片一律渲染於文字訊息上方，AI 伴隨說明一律使用「以上是...」、「如上方所示...」，嚴禁使用「以下是...」。

### 🐛 修復 (Fixed)
- **移除舊版硬編碼 `GROQ_API_KEY` 首頁檢查**：
  - 重構 [`app/actions.ts`](app/actions.ts) 與 [`components/missing-api-key-banner.tsx`](components/missing-api-key-banner.tsx)，改為檢查是否具備任意有效 LLM API 金鑰（Primary / Fallback / Gemini / DeepSeek 等），解決未設定 `GROQ_API_KEY` 時首頁強制彈出錯誤橫幅的問題。
- **解決 Next.js Webpack 圖示相依編譯報錯**：
  - 將 [`components/stocks/web-search-results.tsx`](components/stocks/web-search-results.tsx) 中的外部圖示替換為純 Inline SVG，確保零外部相依編譯成功。
- **公開文件與範本 100% 脫敏與標準化**：
  - 將 [`.env.example`](.env.example)、[`AGENTS.md`](AGENTS.md)、[`README.md`](README.md) 中所有範例全面替換為公有雲標準端點與變數規範，絕不外洩內部網址與金鑰。

---

## [2026-08-26] - 13+ 傳奇投資大師圓桌辯論分析、888 StockBot 品牌升級與動態推薦

### ✨ 新增 (Added)
- **13+ 傳奇投資大師分析團隊**：
  - 擴充 AI 投資顧問團隊陣容，涵蓋巴菲特 (Warren Buffett)、蒙格 (Charlie Munger)、葛拉漢 (Ben Graham)、彼得林區 (Peter Lynch)、女股神 (Cathie Wood)、麥可貝瑞 (Michael Burry)、費雪 (Phil Fisher)、艾克曼 (Bill Ackman)、Nancy Pelosi、WSB 以及基本面/估值/技術/情緒分析師。
  - 於 [`components/tradingview/stock-analysis.tsx`](components/tradingview/stock-analysis.tsx) 支援多輪投資委員會圓桌辯論歷程（Round-table Debate Transcript）的結構化呈現與人性化看多/看空評分。
- **動態推薦股票 Prompt Cards**：
  - 串接 `stock.david888.com` 即時取得當日精選標的（台灣五十 TW50 / 標普五百 S&P 500），並加入無閃爍快取機制。
- **888 StockBot 品牌升級與多語系 (i18n)**：
  - 更新頂部導覽列與介面識別為 888 StockBot，支援繁體中文與多國語系切換。

### 🐛 修復 (Fixed)
- **Undici 限制埠號問題修復**：
  - 解決 Node.js / Undici 阻擋連線至 6000 埠 (bad port restriction) 的問題，改以原生 `node:http` 模組向 AI Hedge Fund 後端發送請求。
- **Python NaN 數值解析修復**：
  - 在後端回傳資料解析前增加正規化過濾，防止 Python 的 `NaN` 導致前端 `JSON.parse` 拋錯。
- **TradingView 標的代碼正規化修復**：
  - 修正波克夏 B 股代碼轉換（`BRK-B` 轉換為 `NYSE:BRK.B`），解決財務指標組件無法載入的問題。
- **Vercel Serverless 超時防護**：
  - 在 [`app/api/stock-analysis/route.ts`](app/api/stock-analysis/route.ts) 設定 `maxDuration = 60s`，避免多輪複雜分析導致 Vercel 請求超時中斷。

---

## [2025-12-04] - AI 投資分析模組整合與多國市場支援

### ✨ 新增 (Added)
- **AI Hedge Fund API 整合**：
  - 首次整合後端多智能體 AI 避險基金分析系統，提供股票全方位分析代理 API。
- **多國市場熱圖與概覽**：
  - 擴充 TradingView 市場熱圖，支援美股 (S&P 500)、德國、澳洲、巴西、加拿大、以色列等多國股市與 ETF 熱圖。
- **繁體中文與台灣股市深度適配**：
  - 支援台股上市櫃（TWSE / TPEX）代碼自動識別與圖表轉換（如台積電 2330）。

---

## [2025-04-10] - 專案初始版本 (Initial Release)

### ✨ 新增 (Added)
- Fork 自 `bklieger-groq/stockbot-on-groq`，基於 Next.js 14、Vercel AI SDK 與 Groq 超高速推理打造。
- 整合 TradingView 互動式金融圖表、即時股價、K線圖、財務報表與股票篩選器。
