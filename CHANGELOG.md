# 更新日誌 (CHANGELOG)

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式規範記錄各版本更新與功能演進。

---

## [2026-08-27] - 2MD 即時連網搜尋、零幻覺檢索政策與 NEN 端點支援

### ✨ 新增 (Added)
- **2MD 即時連網搜尋工具 (`searchFinancialWeb`)**：
  - 於 [`lib/chat/actions.tsx`](file:///Users/david/git/tbdavid2019/stockbot/lib/chat/actions.tsx) 整合 2MD 搜尋引擎 API（[`lib/2md.ts`](file:///Users/david/git/tbdavid2019/stockbot/lib/2md.ts)），支援最新財經新聞、公司 IPO/上市狀態、股票代號查找與即時事件檢索。
  - 新增搜尋結果視覺化卡片組件 [`WebSearchResults`](file:///Users/david/git/tbdavid2019/stockbot/components/stocks/web-search-results.tsx)，提供標題、摘要來源與原文跳轉超連結。
- **零幻覺與即時檢索鐵律 (Zero-Hallucination Policy)**：
  - 在 System Prompt 中加入嚴格檢索規範，嚴禁底層模型憑過期知識臆測公司上市狀態、假日期、假新聞或假數字；面對「SpaceX 股價」等時效性或近期上市標的強制調用 `searchFinancialWeb`。
  - 在解說生成階段 (`generateCaption`) 注入即時檢索數據上下文 (`contextData`)，防止底層 LLM 二次生成文字時因自身知識截止日過期而說出「尚未上市」等矛盾廢話。
- **NEN 主要 API 端點支援**：
  - 支援 `https://nen.com.tw/v1` 作為主要 LLM 推理端點（預設模型 `deepseek-v4-flash`），並保留 Groq 作為備用端點。
- **環境變數範本擴充**：
  - 更新 [`.env.example`](file:///Users/david/git/tbdavid2019/stockbot/.env.example)，新增 `OPENAI_BASE_URL`、`NEN_BASE_URL`、`NEN_API_KEY`、`SEARCH_2MD_API_URL` 等設定說明。

### 🔧 變更 (Changed)
- 更新 [`tsconfig.json`](file:///Users/david/git/tbdavid2019/stockbot/tsconfig.json) 中的 `moduleResolution` 為 `bundler`，提升模組解析相容性。

---

## [2026-08-26] - 13+ 傳奇投資大師圓桌辯論分析、888 StockBot 品牌升級與動態推薦

### ✨ 新增 (Added)
- **13+ 傳奇投資大師分析團隊**：
  - 擴充 AI 投資顧問團隊陣容，涵蓋巴菲特 (Warren Buffett)、蒙格 (Charlie Munger)、葛拉漢 (Ben Graham)、彼得林區 (Peter Lynch)、女股神 (Cathie Wood)、麥可貝瑞 (Michael Burry)、費雪 (Phil Fisher)、艾克曼 (Bill Ackman)、Nancy Pelosi、WSB 以及基本面/估值/技術/情緒分析師。
  - 於 [`components/tradingview/stock-analysis.tsx`](file:///Users/david/git/tbdavid2019/stockbot/components/tradingview/stock-analysis.tsx) 支援多輪投資委員會圓桌辯論歷程（Round-table Debate Transcript）的結構化呈現與人性化看多/看空評分。
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
  - 在 [`app/api/stock-analysis/route.ts`](file:///Users/david/git/tbdavid2019/stockbot/app/api/stock-analysis/route.ts) 設定 `maxDuration = 60s`，避免多輪複雜分析導致 Vercel 請求超時中斷。

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
