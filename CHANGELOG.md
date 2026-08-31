# 更新日誌 (CHANGELOG)

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式規範記錄各版本更新與功能演進。

---

## [2026-08-31] - DeepEar 宏觀邏輯傳導鏈與 AlphaEar 投資訊號證偽追蹤器 (DeepEar Transmission & Signal Tracker)

### ✨ 新增 (Added)

- **DeepEar 即時宏觀事件與多層級傳導鏈工具 (`showTransmissionChain`)**：
  - 串接 [`deepear.vercel.app/latest.json`](lib/deepear.ts) 高頻金融訊號與因果傳導鏈，支援「一階總經/事件觸發 ➔ 二階產業鏈傳導 ➔ 三階企業獲利兌現」多層級結構化分析。
  - 新增原生卡片 [`TransmissionChainCard`](components/stocks/transmission-chain-card.tsx)，即時渲染多層傳導節點、利好/利空/中性衝擊標籤、情緒評分 (-1.0 ~ +1.0) 與信心度指標。
- **AlphaEar 4 態投資訊號演化與證偽判定追蹤器 (`trackInvestmentSignal`)**：
  - 實作機構級投資論點 4 態演化機制（🟢 **Strengthened 強化** / 🟡 **Weakened 弱化** / 🔴 **Falsified 證偽** / ⚪ **Unchanged 維持**）。
  - 新增原生卡片 [`SignalTrackerCard`](components/stocks/signal-tracker-card.tsx)，明確列出 **核心論點證偽條件 (Invalidation Triggers)** 與動態風險控管操作建議，避免主觀死扛。
- **確定性工具路由與對話歷史支援**：
  - 更新 [`lib/chat/routing.ts`](lib/chat/routing.ts)，支援「傳導鏈/連鎖反應/產業鏈衝擊」與「訊號追蹤/證偽/論點驗證」語義確定性分流。
  - 更新 [`lib/chat-history.tsx`](lib/chat-history.tsx)，確保傳導鏈與訊號追蹤卡片完整持久化於本機對話紀錄並無損還原。

---

## [2026-08-30] - 量化估值模型與 DCF 數據管線修復 (Quant Valuation Pipeline Fix)

### 🐛 修復 (Fixed)

- **修復 DCF 與估值卡片空白/破折號 (`—`) 異常**：
  - 修正 Yahoo Finance Fundamentals 查詢缺少流通股數相關指標（`DilutedAverageShares`、`OrdinarySharesNumber`、`BasicAverageShares`、`ShareIssued`），導致 `sharesOutstanding` 解析為 `undefined` 並使 DCF 股價、同業倍數及 5×5 敏感度矩陣全數退化為 `—` 的問題。
  - 在 `fetchQuantMarketSnapshot` 中補齊股數解析階層（優先使用季度/年度 Diluted/Basic/Ordinary 股數，若缺漏則以 `MarketCap / Price` 或 `NetIncome / EPS` 自動推導），並提供自由現金流（FCF）與資本支出（CapEx）的多層容錯。
  - 修復 `calculateCapmWacc` 在股數未提供時資本結構權重塌陷為 100% 債務（WACC 僅 3.95%）的問題，確保權益資本成本正常加權。
- **補齊同業倍數估值三角驗證**：
  - 新增 `fetchPeerMultiples`，自動對應並並發檢索龍頭與同業標的（如 NVDA ➡️ AMD、AVGO、QCOM；TSLA ➡️ RIVN、GM、F；2330 ➡️ 2454、2303、TSM）之 P/E、EV/EBITDA、EV/Sales 倍數，計算同業綜合估值與 DCF 之 60/40 綜合合理價。
- **增強財報前瞻 (Earnings Intelligence) 容錯**：
  - 當 Yahoo `quoteSummary` 因未附帶驗證而回傳 HTTP 401 時，自動無縫回退至結構化財報時間序列萃取近四季實際 EPS、季度營收、YoY 成長率與預估下季財報區間。

---

## [2026-08-30] - 原生量化金融分析工具

### ✨ 新增 (Added)

- 新增純 TypeScript 量化引擎：DCF/CAPM/WACC、同業倍數、5×5 敏感度矩陣、Minervini SEPA、VCP、Black-Scholes Greeks 與多腿損益、Amihud/Float Turnover、平方根市場衝擊及 ETF NAV 溢折價。
- 新增六個確定性聊天工具：`calculateCompanyValuation`、`analyzeSepaStrategy`、`previewEarnings`、`simulateOptionsPayoff`、`analyzeEtfPremium`、`analyzeStockLiquidity`。
- 新增合理價、SEPA、財報前瞻、選擇權損益、股票流動性與 ETF NAV 原生卡片；卡片皆位於 caption 上方，並可安全保存至本機對話歷史。
- Yahoo Finance 結構化資料新增 earnings 日期、EPS/營收共識、四季 surprise 與分析師目標價解析。

### 🧪 驗證 (Verification)

- 通過 `pnpm type-check` 與 `pnpm build`。

---

## [2026-08-30] - 上下文續問架構重寫

### ✨ 改進 (Changed)

- 將回答正文與續問生成拆成獨立階段，移除 caption prompt 中台積電、統一與 Apple 等固定公司範例及通用四選一 fallback。
- 新增工具結果上下文建構：最近問題、工具參數、工具結果、caption、實際 symbol 與當輪證據會共同交給續問模型，避免只改排序或重複同一批標的。
- 財務結構化直答、研究卡、一般金融卡與純文字回答皆會保存 2 ~ 4 個可執行續問，不再於第二輪後消失。
- 集中 `---SUGGESTIONS---` 解析、清理、去重與邀請句過濾；歷史對話仍可還原並繼續追問。
- 續問介面改為輕量文字連結，移除厚重分隔、強烈色塊、陰影與大型膠囊按鈕。
- 使用者自帶模型金鑰若失效或額度不足，工具路由會繼續嘗試伺服器 provider；每輪仍限制最多兩層，避免無上限重試。

### 🧪 驗證 (Verification)

- 通過 TypeScript type check、續問 parser 情境測試與 production build。

## [2026-08-29] - 結構化財務指標與可執行續問修復

### 🐛 修復 (Fixed)

- **財務指標不再只依賴搜尋摘要**：
  - 新增 [`lib/financial-fundamentals.ts`](lib/financial-fundamentals.ts)，直接讀取 Yahoo Finance Fundamentals 年度、季度與 TTM 結構化財務序列。
  - EBITDA、營收、EPS、現金流與估值倍數可直接回覆精確數值、期間、幣別、YoY、TTM；近三年營收可直接列出年度序列並計算 CAGR。
  - 「最新財務數據與估值」改由結構化資料直接生成完整摘要，不再因 LLM token 上限停在半張表。
  - 精準指標已有結構化答案時不再額外等待 2MD 泛用搜尋；結構化資料缺失時才回退即時搜尋與 LLM 證據合成。
- **移除邀請式無效續問**：
  - 前端統一過濾「有興趣嗎」、「想進一步了解嗎」與 `Would you like...` 等無法直接執行的建議，只保留具體研究問題。

---

## [2026-08-29] - 財務檢索與 RSC Runtime 緊急修復

### 🐛 修復 (Fixed)

- 修正 `streamUI` 直接使用 3 秒 `AbortSignal` 後，timeout 於 Server Components render 階段逸出並造成整張卡片崩潰（production digest `3382370668`）；改為單一工具 provider 並由 60 秒 Server Action 上限收斂執行時間。
- 「最新財務數據與估值」等廣義財務需求改走 `answerFinancialMetric` 證據合成，不再送入可能回空資料的舊原生財務卡。
- 新增 AnswerBook 市場目錄名稱解析與多查詢研究檢索：`TWSE:2382`、`TWSE:2603` 會先解析為廣達、長榮，再以純代號、公司名、財報／投資人關係與使用者意圖並行搜尋。
- 搜尋結果加入公司名／代號關聯排序、去重與垃圾來源過濾，排除 YouTube Music 等與公司財務無關結果。

---

## [2026-08-29] - 對話路由與 Vercel 卡片穩定性修復

### 🐛 修復 (Fixed)

- 新增 `lib/chat/routing.ts` 確定性路由：包含 ticker 的大師分析、圖表、股價、財務與新聞請求直接鎖定正確工具。
- 修正「要求多位大師分析卻只顯示 2MD 搜尋結果」的工具優先序錯誤；2MD 僅在沒有可解析 ticker 時負責查證。
- 移除金融卡 caption 的巢狀 RSC token stream，改成卡片先呈現、caption 完成後以純文字更新，避免 Vercel `Connection closed.`。
- 在首頁與歷史對話 page entry 明確設定 `maxDuration = 60`；僅放在 layout 不會套用至 Vercel Server Action。
- 卡片 caption 不再同步等待 2MD 預抓資料，且僅嘗試一個 provider、最多 1.5 秒；即時資料由卡片自身 API 載入，避免拖垮 RSC 連線。
- 工具路由模型最多嘗試兩個 provider，單次 3 秒即中止（最壞 6 秒）；移除 caption 期間多餘的 `aiState.update()`，降低狀態競爭。
- 補齊「值得投資／適合投資」等多輪追問語意，能繼承上一輪 ticker 並直接開啟大師分析卡。
- 修正首頁動態提示卡提交時漏傳使用者 API key 的問題。
- 新增 `answerFinancialMetric` 專用工具：明確 ticker 搭配 EBITDA、YoY/QoQ、TTM、EPS、FCF、ROIC、margin、ratio、估值倍數及其他財務科目時，2MD 僅在後端提供證據，前端直接顯示合成答案與來源連結，不再渲染原始搜尋清單。
- 財務用語路由採「通用財報語義模式 + TOOL_MODEL」雙層判斷，不依賴單一固定指標清單；歷史對話可完整還原財務指標答案卡。
- 明確 ticker 由伺服器解析結果直接覆蓋弱工具模型可能產生的錯誤參數，套用至圖表、股價、財務、新聞、指標問答與大師分析工具。
- 移除原生財務卡的假預設 P/E、ROE、利潤率、成長率與固定「穩健／擴張」結論；上游沒有資料時明確顯示 `—` 或待確認。
- 2MD 公司／產業研究結果新增直接問題合成，不再以搜尋 query 或通用句子冒充回答。
- 一般 2MD 研究來源改為預設折疊的精簡來源卡；完整連結仍可展開核對，不再讓五筆搜尋摘要佔滿對話畫面。
- 13 位大師三批分析完成後新增投資委員會綜合判讀，整理共識、分歧、關鍵數字、風險與待核對事項。

---

## [2026-08-29] - Market Data 標的來源改為即時目錄

### 🐛 修復 (Fixed)

- 移除 dynamic prompts 與行情列中的硬編碼公司、代號與價格，避免下市或過期資料繼續顯示。
- 改用 `answerbook.david888.com` Market Data 的 SP500、Nasdaq100、Dow Jones、TW0050 與 TW0051 目錄。
- `stock.david888.com` 僅用於補充當次抓到的價格；沒有即時價格時不顯示假報價。
- 前端移除舊提示標的的 localStorage 快取，避免隔日持續看到過期標的。

---

## [2026-08-29] - 全工具說明文字即時流式輸出 (Token-by-Token Progressive Streaming)

### ✨ 新增與優化 (Added & Enhanced)

- **全工具即時流式輸出 (`streamCaption`)**：全面將所有金融卡片（走勢圖、報價、原生財務表、原生即時新聞、13 位大師研調、2MD 即時檢索、財報解析）下方的 AI 說明文字由原本整塊同步返回升級為真正的逐字/Token 流式輸出 (`streamText` + `createStreamableValue`)。
- **即時文字游標動畫 (`BotCaption` + `useStreamableText`)**：在卡片與說明文字生成期間顯示打字機動態游標 `▍`，徹底解決過去等待數秒後文字突然蹦出的卡頓體驗。
- **無縫歷史保存相容**：流式生成完畢後自動保存完整 caption 內容至 `localStorage`，重新載入對話時仍保持 100% 完整無瑕還原。

## [2026-08-29] - 提示卡標的池多樣化

### 🐛 修復 (Fixed)

- 提示卡不再只依賴 `stock.david888.com` 的固定標的，也不再反覆顯示統一與台積電。
- 擴充台股、美股、產業鏈、財報與總經標的池，讓「換一批」真正更換內容。

### 🎨 視覺調整 (Changed)

- 移除固定顯示的 `stock.david888.com 範本` 徽章，改用隨機情境標籤。

---

## [2026-08-29] - 暗色模式行情列對比修正

### 🐛 修復 (Fixed)

- TradingView 第一層指數跑馬燈改由 widget 自身繪製主題背景，避免暗色模式出現刺眼白底。

---

## [2026-08-29] - 動態市場提示模板

### ✨ 新增 (Added)

- 建議提示卡改為隨機輪換，不再每次載入都呈現相同順序。
- 新增「換一批」按鈕，提供即時切換的行情、技術面、財報、供應鏈與盤前新聞模板。
- 提示模板連結至 `stock.david888.com`，並沿用該站每日標的資料生成內容。

### 🎨 視覺調整 (Changed)

- 將固定的「建議提示語（點擊直接發問）」改為活潑的情境式標題，並支援中英文切換。

---

## [2026-08-29] - Header Telegram 品牌文案精簡

### 🎨 視覺調整 (Changed)

- 將右上角冗長免責文字改為「本服務僅供參考；投資建議請至 oli-™股靈精怪 Stock」，清楚區分本站與 Telegram bot。
- English 介面同步顯示簡短英文免責文字，保留 Telegram bot 連結。

---

## [2026-08-29] - 對話頁固定行情列與寬版預設

### ✨ 新增 (Added)

- 進入對話後保留雙層行情跑馬燈，並固定於 Header 下方，捲動訊息時仍可查看行情。
- 寬版改為預設版面；使用者仍可從右上角切換至窄版，並記住選擇。

### 🎨 視覺調整 (Changed)

- 手機版台美股報價列採較緊湊的字級與間距，降低固定行情列對對話內容的遮擋。

---

## [2026-08-29] - 報價 API 與 React Hydration 穩定性修復

### 🐛 修復 (Fixed)

- 報價上游改為並行短 timeout；即使外部來源 504，也會快速回傳備援資料。
- 第二跑馬燈改為先顯示備援報價，避免 API 失敗時整列消失。
- 修正 `useLocalStorage` 在首屏直接讀取瀏覽器資料造成的 React hydration mismatch。

---

## [2026-08-29] - TradingView 跑馬燈自適應高度

### 🐛 修復 (Fixed)

- 移除固定高度造成的 TradingView 指數價格與漲跌幅裁切。
- 啟用 compact ticker layout，讓跑馬燈依內容完整顯示並降低垂直佔用。

---

## [2026-08-29] - 首頁版面設計系統整理

### 🎨 視覺調整 (Changed)

- 收斂 Header、TradingView 指數列、首頁歡迎卡片與輸入區的高度及間距。
- 建立一致的導覽列字級階梯，降低桌面與手機版的垂直佔用。
- 保留 Footer 下方可點擊的台美股報價列，避免首頁頂端出現兩層跑馬燈。

---

## [2026-08-29] - 副標題語系與產品描述整理

### 🐛 修復 (Fixed)

- 移除頁面與 PWA 副標題中過度強調 AI 的文案，改為「即時股票圖表與市場分析」。
- 英文環境同步顯示英文頁面標題，不再固定出現中文副標題。
- PWA manifest 改用中性英文名稱，避免安裝提示帶出不符合語系的中文描述。

---

## [2026-08-29] - 2MD 全維度金融研調大腦（總經、美債、產業鏈概念股、法人籌碼）與自主續問機制

### ✨ 新增 (Added)

- **2MD 全維度金融情報並發檢索大腦 (`fetchLiveFinancialIntelligence`)**：
  - 徹底擺脫單一代號搜尋限制，於 [`lib/2md.ts`](lib/2md.ts) 實作多維度並發檢索引擎：
    - 📊 **個股即時行情與估值**：即時報價、歷史本益比、殖利率、營收成長率。
    - ⛓️ **相關個股與產業鏈供應鏈**：概念股族群、上中下游供應鏈（CoWoS、AI 伺服器、散熱、ASIC、蘋概股）、同業市佔率與估值對比。
    - 🏦 **債券、利率與央行政策**：美債 10 年期殖利率 (US10Y)、2 年期殖利率、公債 ETF (TLT, 00679B)、Fed FOMC 利率決策、降息循環利差。
    - 🌐 **總體經濟指標**：CPI、PPI 通膨、非農就業 (NFP)、GDP、景氣對策信號、美元指數 (DXY)、台幣匯率 (TWD/USD)。
    - 📰 **突發財經新聞與法人籌碼**：外資與投信買賣超、融資融券、法說會指引、重大政經事件。
    - 🪙 **大宗商品與數位資產**：原油 (WTI/Brent)、黃金 (XAU)、比特幣 (BTC)。
- **互動式自主續問提示機制 (Suggested Follow-up Prompts)**：
  - 新增 [`components/stocks/followup-prompts.tsx`](components/stocks/followup-prompts.tsx) 與 [`components/stocks/bot-caption.tsx`](components/stocks/bot-caption.tsx)。
  - 在每次 AI 回應與金融圖表下方，自動動態生成 3 ~ 4 個跨維度（概念股供應鏈、總經債券、季報大師解讀）的自主續問按鈕，使用者可一鍵點擊快速追問，免手動重複輸入。
- **LLM 機構級財經深度解讀全面強化**：
  - 重構 [`lib/chat/actions.tsx`](lib/chat/actions.tsx) 的 `generateCaption` 與 System Prompt，徹底解決過往僅回覆單句客套空話的問題，改為提供包含宏觀利率、產業鏈、財務指標與催化劑的機構級全方位專業解說。

---

## [2026-08-29] - 字體、配色與 Header 語系控制

### ✨ 新增 (Added)

- 全站加入 Maple Mono 字體；股票代號、價格與技術數字優先使用 JetBrains Mono。
- 語系切換移至 Header 右上角，與寬版／窄版及深色模式控制集中管理。

### 🎨 視覺調整 (Changed)

- 將背景、卡片、邊框與深色模式調整為乾淨的藍灰色系，保留橘色品牌操作色。

---

## [2026-08-29] - 免責文字整理、寬版切換與指數報價恢復

### ✨ 新增 (Added)

- Header 加入窄版／寬版切換，預設窄版並記住使用者選擇；手機版維持響應式排版。

### 🐛 修復 (Fixed)

- 移除輸入框下方重複的投資免責文字，只保留 Header 右上角版本。
- Header 右上角免責文字放大。
- 恢復 TradingView ticker iframe 的 S&P 500、Nasdaq 100、Bitcoin 數值，並保留 API 台股／美股價格跑馬燈。

---

## [2026-08-29] - Header 主題切換與跑馬燈恢復

### 🐛 修復 (Fixed)

- **主題切換按鈕位置**：移除固定在左下角的定位，改放在 Header 右側工具區，避免遮住歷史紀錄與頁面內容。
- **跑馬燈動畫與預設市場**：恢復自動橫向循環，補回 S&P 500、Nasdaq 100、Bitcoin 等預設項目；台股／美股 API 報價仍會每 5 分鐘更新。
- **深色模式樣式**：報價列同步使用背景、文字與分隔線的 dark mode 顏色。

---

## [2026-08-29] - 2MD AnyDoc 財報與年報深度解讀、PDF/文件上傳與分析工具鏈

### ✨ 新增 (Added)

- **2MD AnyDoc 財報與年報多模態解讀引擎 (`lib/2md.ts`)**：
  - 於 [`lib/2md.ts`](lib/2md.ts) 實作 `parseDocument2MD` 與 `batchReadUrls2MD`，支援將 PDF、Word (.docx)、Excel (.xlsx/.csv)、PPT、TXT 轉換為結構化乾淨 Markdown。
  - 支援遠端財報/年報/SEC 10-K/10-Q 網址直讀 (`readUrl2MD`) 與本機文件 Multipart Form-Data 上傳解析。
- **後端文件解析 API 端點 (`/api/parse-document`)**：
  - 新增 [`app/api/parse-document/route.ts`](app/api/parse-document/route.ts)，支援最大 25MB 文件解析與自動頁數萃取，串接 2MD 多端點容錯備援。
- **財報/年報/PDF 互動式視覺卡片 (`FinancialReportCard`)**：
  - 新增 [`components/stocks/financial-report-card.tsx`](components/stocks/financial-report-card.tsx)，提供文件標題、頁數徽章、內容摘錄、一鍵複製 Markdown 與展開全文功能。
- **自主財報分析工具 (`readFinancialReport`)**：
  - 於 [`lib/chat/actions.tsx`](lib/chat/actions.tsx) 註冊 `readFinancialReport` 工具，支援 AI 自主提取三大財務報表（損益表、資產負債表、現金流量表）、計算毛利率/ROE/ROIC/自由現金流 (FCF)、評估管理層指引 (Guidance) 與風險因子。
- **前端 📎 財報/PDF 文件上傳器 (`PromptForm`)**：
  - 於 [`components/prompt-form.tsx`](components/prompt-form.tsx) 新增 📎 檔案上傳按鈕，支援上傳進度狀態、附件預覽徽章 (含頁數標籤與一鍵移除)、拖曳與自訂分析 Prompt 提交。

---

## [2026-08-29] - 對話歷史紀錄抽屜 (Chat History Drawer)、本機 LocalStorage 持久化與無縫回顧切換

### ✨ 新增 (Added)

- **對話歷史紀錄抽屜 (Chat History Drawer)**：
  - 新增 [`components/chat-history-sheet.tsx`](components/chat-history-sheet.tsx)，於頂部導覽列左側提供「📜 歷史紀錄」按鈕與動態對話數量徽章。
  - **智慧時間分組**：自動將對話依「今天 (Today)」、「昨天 (Yesterday)」、「過去 7 天 (Last 7 Days)」與「更早以前 (Older)」分組呈現。
  - **即時搜尋過濾**：搜尋框支援即時過濾歷史對話標題與文字關鍵字。
  - **對話管理能力**：支援自訂修改標題 (✏️)、單筆對話刪除 (🗑️)、以及清除所有對話歷史（附帶二次確認防誤觸視窗）。
- **完整 LocalStorage 本機對話持久化與狀態還原**：
  - 新增 [`lib/chat-history.tsx`](lib/chat-history.tsx)，每次對話與工具執行（包括 TradingView 走勢圖、即時報價、大師 AI 分析、2MD 搜尋、Wiki 發布結果）皆自動同步保存於本機 `localStorage` (`stockbot_chat_sessions_v1`)。
  - **全組件 UI State 還原器 (`createUIStateFromStoredMessages`)**：點擊歷史對話時即時將序列化狀態還原為對應的 React Financial Cards 組件與 AI 對話上下文，無須重新向 LLM 發送請求即可回顧完整圖表。
- **動態對話路由支援**：
  - 新增 [`app/(chat)/chat/[id]/page.tsx`](<app/(chat)/chat/[id]/page.tsx>)，支援直接透過 URL 分享或重新載入特定歷史對話。
- **工具伴隨總結文字持久化 (Caption Persistence)**：
  - 於 [`lib/chat/actions.tsx`](lib/chat/actions.tsx) 更新 13 個工具調用，在寫入 `aiState.done` 前先生成 `caption` 並存放於 `result.caption`，確保歷史回顧時所有伴隨解說文字完好無損。

### 🐛 修復與 SEO 優化 (Fixed & SEO)

- **修正標題重複問題 (`888 StockBot - 888 StockBot`)**：
  - 根治 Next.js `title.template` 與首頁 `metadata.title` 衝突引發的重複標題問題。
  - 將根佈局設定為 `title.default = '888 StockBot - 即時 AI 股票圖表與大師投資分析'`，子頁面使用 `%s | 888 StockBot`。
- **全面修復 Open Graph、Twitter Cards 與 SEO Meta 標籤**：
  - 設定 `metadataBase` 為 `https://bot.david888.com`，根絕社群平台無法讀取預覽圖 (`og:image` broken) 問題。
  - 加入 canonical 網址 (`https://bot.david888.com`)、`og:url`、`og:site_name`、`og:locale` (`zh_TW`) 與 `twitter:site` (`@david888`)。
  - 補齊 `favicon.svg`、`favicon-32x32.png`、`site.webmanifest` (PWA 支援) 與 `<html lang="zh-TW">` 語系宣告。
  - 注入 Schema.org `WebApplication` JSON-LD 結構化資料，提升搜尋引擎 Rich Snippet 與排名權重。

---

## [2026-08-29] - 台股跑馬燈價格修復與介面清理

### 🐛 修復 (Fixed)

- **修正台股跑馬燈不顯示股價**：
  - 將 `/api/dynamic-prompts` 回傳的台股價格顯示於 TradingView 跑馬燈。
  - 強化 `TWSE`、`TPEX` 與 `.TW` / `.TWO` 股票代碼正規化。

### 🧹 介面調整 (Changed)

- 移除首頁的 AI Function Calling / Vercel AI SDK / TradingView Widgets 介紹段落。
- 移除右上角 GitHub 按鈕與 GitHub icon。
- Footer 新增「技術提供 david888.com」。
- 優化手機版 Header、提示卡與底部輸入面板，避免內容遮住或產生橫向溢出。

### ✨ 新增 (Added)

- **完整 TradingView Stock Heatmap 市場清單**：加入官方 widget data source 可用的北美、南美、歐洲、中東非洲、亞洲與太平洋市場，並以分區下拉選單呈現，手機版不再被大量按鈕推爆。
- **公司名稱轉股票代號**：常見中英文公司名稱可直接正規化為交易所代號；未知名稱要求先經 `searchFinancialWeb` 即時查證後再呼叫股票工具。

### 🐛 修復 (Fixed)

- **修正報價快取過久**：動態股票 API 改為 5 分鐘記憶體快取、上游請求使用 `no-store`，前端每 5 分鐘刷新。
- **修正台股價格被 TradingView iframe 隱藏**：跑馬燈改由 `/api/dynamic-prompts` 直接渲染台股／美股價格，避免 iframe 對台股標的只顯示名稱或錯誤圖示。

## [2026-08-28] - 15 輪多輪自主工具循環、David888 WikiPublisher 自主發布器與 2MD Web Reader

### ✨ 新增 (Added)

- **15 輪多輪自主工具循環 (Autonomous 15-Round Multi-Step ReAct Loop)**：
  - 於 [`lib/chat/actions.tsx`](lib/chat/actions.tsx) 支援最多 15 輪多步自主工具調用與推理鏈，實現複雜調研：搜尋 ➔ 網頁深讀 ➔ 13 位大師分析 ➔ 線圖繪製 ➔ 自動產出並發布 Wiki 報告。
- **David888 WikiPublisher 自主發布器 (`publishToDavid888Wiki`)**：
  - 整合 [`https://wiki.david888.com/api`](lib/wiki.ts) REST API，嚴格遵守最新 `SKILL.md` 規範。
  - **👑 首行標題鐵律 (Mandatory Level-1 Title Rule)**：落實 Markdown 文件第一行必須以 `# Document Title` 開頭之嚴格要求，後端自動過濾並清理開頭對話性閒聊（Preamble/Chatter），並確保 `[TOC]` 與 `> 執行摘要` 緊隨於第一行 `# Title` 之後，確保 HTML `<title>`、Open Graph 與社群預覽卡片精確解析。
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
