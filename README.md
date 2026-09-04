<h2 align="center">
 <br>
 <img src="https://i.imgur.com/f1C7EdN.png" alt="AI StockBot Powered by Groq with Tool Use and Generative UI" width="250">
 <br>
 <br>
 股票機器人 (StockBot) 由 Groq 提供支援：閃電般快速的 AI 聊天機器人，能即時回應互動式股票圖表、財務數據、新聞、篩選器等功能
 <br>
</h2>

本專案fork自 https://github.com/bklieger-groq/stockbot-on-groq
修正後的分支

<p align="center">
 <a href="#概述">概述</a> •
 <a href="#功能特點">功能特點</a> •
 <a href="#Interfaces">界面展示</a> •
 <a href="#Quickstart">快速開始</a> •
 <a href="#Credits">致謝</a>
</p>

<br>
[股票機器人演示](https://github.com/user-attachments/assets/a50fa266-5ae9-4869-a37f-599d7db790d9)
> 股票機器人演示提供相關、即時和互動式的股票圖表和界面，現已支援台灣股票市場！

[![使用 Vercel 部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftbdavid2019%2Fstockbot&env=GROQ_API_KEY&envDescription=Get%20a%20Groq%20API%20Key&envLink=https%3A%2F%2Fconsole.groq.com%2Fkeys&project-name=stockbot-clone&repository-name=stockbot-clone&demo-title=StockBot&demo-description=Build%20a%20lightning-fast%20AI%20chatbot%20powered%20by%20Groq%20and%20Vercel%20AI%20SDK%20that%20responds%20with%20live%20stock%20charts%2C%20financials%2C%20news%2C%20and%20screeners.&demo-url=https%3A%2F%2Fgroq-stockbot.vercel.app%2F&demo-image=https%3A%2F%2Fi.imgur.com%2FjJfm8mm.png)

## 概述

股票機器人是一個由 AI 驅動的聊天機器人，它利用 Groq 上的高速推理服務、Vercel 的 AI SDK 和 TradingView 的即時小工具，通過對話方式提供即時、互動式圖表和界面，專門根據您的請求定制。Groq 的高速處理能力使工具調用和響應幾乎瞬間完成，允許通過兩個 API 調用序列與專門的提示返回響應。現在已支援台灣股票市場查詢！

> [!IMPORTANT]
> 注意：股票機器人可能提供不準確的信息，並不提供投資建議。它僅供娛樂和教學使用。

## 功能特點

- 🤖 **即時 AI 聊天機器人**：與高速回應的 AI 互動，通過自然語言對話請求股票新聞、信息和圖表
- 📊 **互動式股票圖表**：接收幾乎即時的、上下文感知的響應，包含承載實時數據的互動式 TradingView 圖表
- 🔄 **自適應界面**：動態渲染 TradingView UI 組件，為您的特定查詢定制金融界面
- 📌 **固定行情跑馬燈與寬版介面**：進入對話後雙層行情列固定於導覽列下方；桌面預設寬版，手機版自動採緊湊排版
- ⚡ **Groq 驅動的性能**：利用 Groq 的尖端推理技術，實現近乎即時的響應和無縫用戶體驗
- 🌐 **多資產市場覆蓋**：訪問股票、外匯、債券和加密貨幣的全面數據和分析
- 🇹🇼 **台灣股票市場支持**：現已支援台灣股票市場查詢，包括台積電等台灣上市公司
- 📈 **動態股票報價跑馬燈**：直接顯示 API 回傳的台股／美股最新價格，5 分鐘自動更新，不受 TradingView ticker iframe 對台股欄位限制影響
- 🧭 **公司名稱自動轉代號**：支援常見中英文公司名稱與台股代號正規化；未知或模糊公司會先做即時金融搜尋，再交給 TradingView
- 🎯 **確定性對話路由**：訊息已包含 ticker 時，股價、圖表、財務、新聞與大師分析會直接呼叫指定卡片；不會再用 2MD 搜尋卡取代明確的大師分析要求
- 📌 **財務用語直接回答**：詢問 EBITDA、YoY/QoQ、TTM、EPS、FCF、ROIC、margin、ratio、估值倍數或其他財報科目時，後端優先讀取 Yahoo Finance Fundamentals 年度、季度與 TTM 結構化序列，直接計算同比、近四季合計與 CAGR；上方顯示精簡來源卡，下方回覆數值、期間、幣別與口徑，不再把搜尋摘要當成財務答案
- 🧾 **財務摘要直接回答**：「最新財務數據與估值」等多指標需求同樣走證據合成；台股會先由 AnswerBook Market Data 將代號解析回公司名，再並行查詢財報、估值與投資人關係來源。
- 🧠 **大師分析綜合判讀**：13 位大師三批資料完成後，由獨立合成流程整理多數共識、關鍵分歧、數字證據與風險，避免只把原始觀點卡丟給使用者自行閱讀
- 🛡️ **Vercel 卡片穩定性**：金融卡與 caption 已解除巢狀 RSC 串流，首頁與歷史對話 page function 設定 60 秒上限；卡片即時資料不再阻塞 Server Action，避免 `Connection closed.` 連帶摧毀整張卡片
- 🗺️ **TradingView 熱力圖市場清單**：依官方 widget data source 補齊北美、南美、歐洲、中東非洲、亞洲與太平洋等市場，包含台灣全市場與台灣 50
- 📜 **對話歷史紀錄與抽屜面板** (新功能)：點擊導覽列「📜 歷史紀錄」滑出左側面板，依今天、昨天、過去7天、更早以前清晰分組，支援標題搜尋、修改與單筆刪除
- 🔒 **本機 LocalStorage 隱私存儲** (新功能)：對話、互動圖表、即時報價、AI 大師分析與 2MD 搜尋結果完全保存在瀏覽器本機，0 伺服器依賴、隱私安全無虞且隨點隨看
- 💡 **上下文續問提示**：回答正文與續問生成已解耦；系統會讀取最近問題、工具參數、卡片結果與實際標的，於每輪產生 2 ~ 4 個可直接執行的續問。財務直答、研究卡與純文字回答皆可持續多輪，並以低干擾文字連結呈現
- 🎲 **隨機市場提示模板**：首頁提示卡會依 `answerbook.david888.com` Market Data 即時標的目錄隨機輪換，`stock.david888.com` 僅補充當次價格，支援手動「換一批」
- 🔍 **2MD 全維度金融研調大腦** (新功能)：自動並發檢索個股行情、產業鏈上下游/概念股、美債 10 年殖利率、聯準會降息循環、總經 CPI/GDP 指標與法人外資籌碼，LLM 具備機構級研調視野
- 📑 **財報與年報深度解讀 & 文件上傳** (新功能)：點擊輸入框 📎 即可上傳 PDF、Excel、Word 財報文件，或直接提供 10-K/10-Q 網址，由 2MD AnyDoc 引擎秒級萃取三大報表、計算關鍵財務比率並進行深度投資評價
- 🤖 **AI 投資分析** (新功能)：整合 AI Hedge Fund API，提供傳奇投資大師（巴菲特、葛拉漢、乾克曼等）的專業投資建議
- 📐 **原生量化分析** (新功能)：提供 DCF/CAPM/WACC、同業倍數與 5×5 敏感度矩陣的合理價模型；缺少 beta 或負 EBITDA 時會使用可標示的產業預設並降級至 EV/Sales。
- 🚀 **SEPA 趨勢策略** (新功能)：檢查 Minervini 八項 Trend Template、Stage 1–4、VCP 收縮型態、5% 買入區、停損與風險式部位大小。
- 🧾 **財報前瞻** (新功能)：顯示公開 earnings 日期、EPS/營收共識區間、分析師目標價與最近四季 beat/miss surprise。
- 🧮 **衍生品與微結構** (新功能)：支援 Black-Scholes 多腿選擇權互動曲線、ETF NAV 溢折價/GEX 欄位，以及 Amihud、float turnover 與平方根市場衝擊估算。

## AI 投資分析功能

StockBot 整合了 AI Hedge Fund API，可以模擬多位傳奇投資大師的投資風格，為您提供專業的股票分析建議。

### 使用方式

在聊天中直接詢問：

- "TSLA 值得買嗎？"
- "分析一下 NVDA"
- "Should I buy AAPL?"

### 分析師團隊

| 類別              | 分析師                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| 📊 價值投資大師   | Ben Graham、Warren Buffett、Charlie Munger、Bill Ackman、Peter Lynch、Phil Fisher、Michael Burry |
| 🚀 成長與創新     | Cathie Wood                                                                                      |
| 📈 技術與情緒分析 | Technical Analyst、Sentiment Analyst、Nancy Pelosi、WSB                                          |
| 📐 基本面與估值   | Fundamentals Analyst、Valuation Analyst                                                          |

### 後端 API 設定

AI 投資分析由後端 AI Hedge Fund API 提供服務（預設連線至 `http://dns.glsoft.ai:6000`）。若需自訂可於環境變數設定：

```bash
# .env.local
AI_HEDGE_FUND_HOST=dns.glsoft.ai
AI_HEDGE_FUND_PORT=6000
```

### 相關檔案

- `app/api/stock-analysis/route.ts` - API 代理路由
- `components/tradingview/stock-analysis.tsx` - 多輪委員會分析與辯論結果組件
- `lib/chat/actions.tsx` - 聊天工具定義 (analyzeStockWithAI)
- `lib/quant/valuation.ts`、`lib/quant/sepa.ts`、`lib/quant/black-scholes.ts`、`lib/quant/microstructure.ts` - 純 TypeScript 量化引擎
- `components/stocks/company-valuation-card.tsx`、`sepa-strategy-card.tsx`、`earnings-briefing-card.tsx`、`options-payoff-card.tsx`、`stock-liquidity-card.tsx`、`etf-premium-card.tsx` - 原生量化卡片

## 📊 原生金融情報與量化分析卡片一覽 (15 Financial Cards Reference)

StockBot 內建 15 套機構級原生 React 金融視覺化卡片，所有卡片均遵循現代金融終端 Design System 規範，支援高清晰字體層級、自適應響應式佈局，並具備純本機 `localStorage` 狀態還原機制：

| # | 卡片名稱 / 組件 | 調用工具 | 資料來源與核心功能 | 提問範例 |
| :- | :--- | :--- | :--- | :--- |
| **1** | **🏛️ 三大法人籌碼情報卡**<br>`<InstitutionalFlowCard />` | `showInstitutionalFlow` | 直連 **TWSE 證交所 (T86/MI_QFIIS)** 與 **TPEX 櫃買中心** 官方 API。提供外資、投信、自營商（自行買賣+避險）今日買賣超**張數**、5 日累計、外資持股比率 %、連買連賣天數與四大籌碼訊號（🟢 土洋同買、⚔️ 土洋對作、🚀 投信連買認養、🔴 三大法人同步賣超）。 | `2330 法人買賣超`<br>`聯發科投信連買幾天？` |
| **2** | **📈 量化 DCF 估值合理價卡**<br>`<CompanyValuationCard />` | `calculateCompanyValuation` | 採用 5 年 FCFF 現金流折現、CAPM/WACC 資本成本計算，結合同業 P/E、EV/EBITDA、EV/Sales 倍數加權中位數，並提供 **WACC × 終值成長率 5×5 敏感度分析矩陣**。針對負現金流擴張期企業套用標準化利潤率平滑。 | `NVDA 合理價是多少？`<br>`特斯拉 DCF 估值` |
| **3** | **📊 核心財務報表指標卡**<br>`<NativeFinancialsCard />` | `showStockFinancials` | 整合 4 大維度指標矩陣：(1) 估值倍數 (P/E, P/B, P/S)、(2) 獲利能力 (ROE, 淨利率, 營業利益率)、(3) 財務體質 (流動比率, 負債權益比)、(4) 成長動能 (營收 YoY, 獲利 YoY) 與 DCF 內在價值摘要。 | `台積電財務報表`<br>`AAPL 財務指標分析` |
| **4** | **📌 財務數據即時核實卡**<br>`<FinancialMetricCard />` | `answerFinancialMetric` | 針對特定財報科目、會計比率、成長率等問題，優先檢索結構化財報時間序列計算精確數值、期間與口徑，並在上方卡片直接標註核實之官方文件來源外鏈。 | `NVDA 最新一季 EBITDA 是多少？`<br>`台積電近三年營收 CAGR` |
| **5** | **🎯 Minervini SEPA 趨勢動能卡**<br>`<SepaStrategyCard />` | `analyzeSepaStrategy` | 嚴格檢驗 Mark Minervini 8 項 Trend Template 趨勢模板、Stage 1–4 階段判定、RS 強度評級、VCP 波動收縮型態、Pivot 關鍵買點、5% 買入區、停損點與**風險部位股數計算機**。 | `TSLA SEPA 趨勢分析`<br>`2330 符合 SEPA 買點嗎？` |
| **6** | **📅 財報前瞻與分析師共識卡**<br>`<EarningsBriefingCard />` | `previewEarnings` | 揭示預計公布日期（盤前/盤後）、華爾街分析師 EPS 與營收共識區間、分析師平均目標價與潛在空間，並提供過去四季實際 EPS vs 預估值之 Beat/Miss Surprise 驚喜度實績表。 | `NVDA 什麼時候公布財報？`<br>`微軟財報預期與目標價` |
| **7** | **📊 US FDDK 20 年多因子資產配置卡**<br>`<MacroFactorRegimeCard />` | `showMacroFactorRegime` | 串接 `voidful/us_fddk` 20 年可稽核歷史凍結數據與 Fama-French 多因子模型。提供扣除 10/50 bps 滑價成本之跨資產 ETF 策略回測，即時對比 SPY、QQQ、80/20 VUG/SHY、60/40 股債平衡之 CAGR、夏普比率、最大回撤與下跌捕獲率。 | `20年資產配置回測`<br>`80/20 股債平衡策略績效` |
| **8** | **⛓️ DeepEar 宏觀邏輯傳導鏈卡**<br>`<TransmissionChainCard />` | `showTransmissionChain` | 串接因果傳導引擎，深度剖析「一階總經/事件觸發 ➔ 二階產業鏈傳導 ➔ 三階企業獲利兌現」連鎖反應，標註利好/利空衝擊、情緒評分、信心度與**核心論點證偽判定點 (Falsification Criteria)**。 | `降息對科技股的傳導鏈`<br>`地緣政治對半導體的連鎖衝擊` |
| **9** | **🔍 AlphaEar 投資訊號演化追蹤卡**<br>`<SignalTrackerCard />` | `trackInvestmentSignal` | 實作投資假說 4 態演化（🟢 **Strengthened** / 🟡 **Weakened** / 🔴 **Falsified** / ⚪ **Unchanged**），列出最新佐證數據、關鍵證偽條件與動態風險控管部位調整建議。 | `追蹤 NVDA 投資假說`<br>`特斯拉多頭論點是否被證偽？` |
| **10** | **⚡ Black-Scholes 期權損益模擬卡**<br>`<OptionsPayoffCard />` | `simulateOptionsPayoff` | 提供 Black-Scholes 定價模型互動式多腿選擇權損益圖。支援即時調整現價 (Spot)、履約價 (Strike)、到期天數 (DTE) 與隱含波動率 (IV)，動態繪製到期損益 (Expiry) 與現值理論曲線 (Current) 及損益兩平點。 | `AAPL 選擇權損益模擬`<br>`NVDA 跨式期權策略曲線` |
| **11** | **💧 市場微結構流動性分析卡**<br>`<StockLiquidityCard />` | `analyzeStockLiquidity` | 計算 Amihud 非流動性指標、年化自由流通股週轉率 (Float Turnover)、流通盤出清天數 (Days to Liquidate) 與 Square-Root Market Impact 平方根市場衝擊曲線，精準估算大單進出場滑價成本 (bps)。 | `2330 流動性分析`<br>`買進 5 萬股 NVDA 滑價衝擊` |
| **12** | **🏷️ ETF 淨值溢折價監控卡**<br>`<EtfPremiumCard />` | `analyzeEtfPremium` | 即時監控 ETF 市價與基金淨值 (NAV) 之溢價 (Premium) / 折價 (Discount) 幅度、Dealer GEX 伽瑪暴露狀態、買賣價差 (Bid-Ask Spread) 與同類 ETF 中位數對照。 | `0050 溢折價查詢`<br>`SPY NAV 淨值與 GEX 狀態` |
| **13** | **🌐 2MD 即時連網研調來源卡**<br>`<WebSearchResults />` | `searchFinancialWeb` | 由 2MD 全網情報大腦並發檢索最新重大快訊、供應鏈上下游、法說會動態與總經環境，以摺疊清單呈現可信來源標題、網址與內文摘要。 | `SpaceX 最新上市估值與新聞`<br>`全球人形機器人供應鏈` |
| **14** | **📑 AnyDoc 財報文件解析卡**<br>`<FinancialReportCard />` | `readFinancialReport` | 支援線上財報網址或本機上傳之 PDF、Excel、Word、PPT 文件（最大 25MB）。秒級萃取三大報表、管理層指引與風險因子，支援一鍵複製與全文展開。 | `閱讀這份台積電法說會簡報`<br>`分析上傳的財報 PDF` |
| **15** | **🏛️ 傳奇大師多維度研調卡**<br>`<StockAnalysis />` | `analyzeStockWithAI` | 整合 AI Hedge Fund API，由 13 位傳奇投資大師（巴菲特、葛拉漢、蒙格、木頭姐等）分為 3 批次漸進式研調，呈現各分析師多空訊號、圓桌委員會辯論對話過程與投資委員會綜合決策判讀。 | `台積電值得買嗎？`<br>`13位大師分析 NVDA` |
| **16** | **📅 全球重大總經日曆卡**<br>`<EconomicCalendarCard />` | `showEconomicCalendar` | 透過 2MD Fast Reader 即時萃取 Investing.com 全球重大財經日曆（非農就業、CPI、PMI、央行決議與倒數時間）、三大期指盤前行情、美債殖利率曲線（10Y/2Y）與大宗商品（原油/黃金），具備 Singleflight 防驚群與 TTL 快取。 | `今晚有什麼重大總經數據？`<br>`美股盤前期貨與經濟日曆` |

---

## 📈 TradingView 互動組件 (TradingView Interactive Widgets)

| 組件名稱 | 說明 | 預覽截圖 |
| :--- | :--- | :--- |
| **互動式即時走勢圖** (`StockChart`) | 支援 Candlestick K 線、成交量與多週期指標分析。 | ![Candlestick Stock Charts](https://github.com/user-attachments/assets/ce9ea4a8-a1fe-4ce7-be60-3f5d64d50ced) |
| **全市場熱力圖** (`MarketHeatmap`) | 支援北美、歐洲、亞洲與台灣全市場 (AllTW / TW50)。 | ![Heatmap of Daily Market](https://github.com/user-attachments/assets/2e3919a3-280b-4be4-adcd-a1ff636bff3e) |
| **ETF 板塊熱力圖** (`ETFHeatmap`) | 跨資產與產業板塊 ETF 表現視覺化。 | ![ETF Heatmap](https://github.com/user-attachments/assets/cb2b29d9-acb7-4c8f-90c7-0390e72907f6) |
| **股票篩選器** (`StockScreener`) | 依基本面與技術指標篩選潛力標的。 | ![Stock Screener](https://github.com/user-attachments/assets/8ecadec9-69a1-4e18-a9fe-7b30df9f6ff5) |
| **市場概況行情** (`MarketOverview`) | 股票、期貨、債券、外匯即時行情看板。 | ![Market Overview](https://github.com/user-attachments/assets/79048f3b-9153-41f9-8de5-6b3d45f331dd) |
| **熱門排行榜** (`MarketTrending`) | 今日漲幅榜、跌幅榜與成交量榜。 | ![Trending Stocks](https://github.com/user-attachments/assets/848c1ebf-7828-4116-a041-6f0ba7156bd5) |

## LLM 與多階層備援設定 (LLM & Multi-Tier Fallback Configuration)

StockBot 支援 **無限階層動態容錯路由 (Multi-Tier Dynamic Failover Router)**，並將模型拆分為兩大職責：

- **`TOOL_MODEL` (工具模型)**：專用於 `streamUI` 的 Function Calling、意圖識別與圖表/分析卡片調用。
- **`MODEL` (文字模型)**：一般卡片使用短時限 `generateCaption`；即時研究答案與 13 位大師綜合判讀使用獨立、具證據上下文的合成流程。卡片正文完成後另以同一端點產生上下文續問；失敗時只依當輪標的、問題與工具意圖產生本機 fallback，不需要額外金鑰。

### 常用環境變數一覽

```bash
# 1. 主要端點 (Primary LLM - 如 OpenAI / Azure / 自訂端點)
PRIMARY_BASE_URL=https://api.openai.com/v1
PRIMARY_API_KEY=your_primary_api_key
PRIMARY_TOOL_MODEL=gpt-4o-mini
PRIMARY_MODEL=gpt-4o-mini

# 2. 第 1 備用端點 (Fallback #1 - 如 Groq 極速推理)
FALLBACK_1_BASE_URL=https://api.groq.com/openai/v1
FALLBACK_1_API_KEY=gsk_your_groq_api_key
FALLBACK_1_TOOL_MODEL=openai/gpt-oss-20b
FALLBACK_1_MODEL=openai/gpt-oss-20b

# 3. 第 2 備用端點 (Fallback #2 - 如 Google Gemini / Azure OpenAI)
FALLBACK_2_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
FALLBACK_2_API_KEY=your_gemini_api_key
FALLBACK_2_TOOL_MODEL=gemini-2.5-flash
FALLBACK_2_MODEL=gemini-2.5-flash

# 4. 2MD 即時連網搜尋
TWOMD_PRIMARY_URL=https://2md.aiurl.tw

# 5. AI Hedge Fund 投資分析後端
AI_HEDGE_FUND_HOST=dns.glsoft.ai
AI_HEDGE_FUND_PORT=6000
```

## Quickstart

> [!IMPORTANT]
> To use StockBot, you can use a hosted version at [bot.david888.com](https://bot.david888.com/).
> Alternatively, you can run StockBot locally using the quickstart instructions.

To get started locally, you can run the following:

```bash
cp .env.example .env.local
```

Configure your LLM API keys in `.env.local`, then run:

```bash
pnpm install
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).

## 🤖 LLMs.txt & AI Agent 協定支援 (llmstxt.org)

StockBot 2.0 原生支援由 Jeremy Howard 發起之 [llmstxt.org](https://llmstxt.org/) 開放標準協定，為外部 LLM 爬蟲、Perplexity、Cursor、ChatGPT、Claude 及各類 AI Agent 提供結構化、無廢話之機器可讀知識索引：

- **標準索引**：[`/llms.txt`](public/llms.txt)（符合 llms.txt v2 規範，包含 15 套卡片索引、核心架構與 Benchmark 題庫鏈接）
- **完整參考手冊**：[`/llms-full.txt`](public/llms-full.txt)（包含所有量化公式、API Schema、演算法細節與純文字提示詞集）
- **自動發現機制**：HTML `<head>` 內建 `<link rel="describedby" href="/llms.txt" />` 與 `<link rel="alternate" type="text/markdown" href="/llms-full.txt" />`，支援全網 AI 智能體自動識別與檢索。

## Credits

This app was originally developed by [Benjamin Klieger](https://x.com/benjaminklieger) at [Groq](https://groq.com) and uses the AI Chatbot template created by Vercel: [Github Repository](https://github.com/vercel/ai-chatbot). Taiwan stock market support was added by [tbdavid2019](https://github.com/tbdavid2019).

技術提供：[david888.com](https://david888.com)

