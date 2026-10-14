# 04. 安全防護、自備金鑰與文件解析 (Security, BYOK & Document Parsing)

## 1. 🔑 BYOK 自備金鑰機制 (Bring Your Own Key)

- **純本機儲存與伺服器零留存保證 (Server-Zero Retention Guarantee)**：
  - 使用者自備之 API Key 僅留存於瀏覽器 `localStorage` (`stockbot_user_api_key_config`)。
  - 送出查詢時，前端將 Key 透過參數與 Header 無狀態透傳給 Serverless Function，伺服器記憶體完成單次請求即銷毀，絕不寫入伺服器硬碟、資料庫或日誌。
  - 支援 OpenAI、Groq、Google Gemini、DeepSeek 與自訂 OpenAI-Compatible 端點。
  - 全鏈路覆蓋：`submitUserMessage`、`generateCaption`、上下文續問與 13 位大師綜合判讀皆優先注入使用者的 BYOK。
- **429 額度耗盡與 401 授權優雅降級**：
  - 當系統免費額度或自備金鑰額度耗盡時，自動渲染原生 `<QuotaExceededCard />`，並提供一鍵開啟自備金鑰設定對話框。
- **安全金鑰隔離 (`extractByokDecisionKeys`)**：
  - 嚴格分離不同 Provider 之金鑰，絕不將 Groq / Gemini 憑證傳遞給 OpenAI 端點。

---

## 2. 🛡️ 硬核 SSRF (Server-Side Request Forgery) 防護

在 [`lib/security-url.ts`](../../lib/security-url.ts) 中實作嚴格的網址與 IP 審查：

- 凡使用者自訂之 `baseURL`，後端強制執行 `isSafeApiBaseUrl` 校驗。
- 強制限定 `https://` 協定。
- 全面封鎖所有私有 IPv4 網段（`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`）。
- 封鎖雲端中繼 Metadata 網段（`169.254.169.254`, `169.254.0.0/16`）。
- 封鎖 IPv6 本機迴路（`::1`）、Link-local（`fe80::`）、Unique-local（`fc00::`）及 `::ffff:` 映射。
- 封鎖常見 Wildcard DNS 隧道服務（`*.nip.io`, `*.sslip.io`, `*.xip.io` 等），杜絕任何內網探測攻擊。

---

## 3. 📑 2MD AnyDoc 財報解析與多模態文件架構

- **多端點 AnyDoc 容錯解析 ([`lib/2md.ts`](../../lib/2md.ts))**：
  - 實作 `parseDocument2MD` 與 `readUrl2MD`，支援 PDF、Word (.docx)、Excel (.xlsx/.csv)、PPT、TXT。
- **自主財報工具 (`readFinancialReport`)**：
  - 當使用者提供線上財報/年報/SEC 10-K/10-Q 網址時，AI 自主抓取並結構化剖析三大財務報表、計算毛利率/ROE/ROIC/自由現金流 (FCF)、評估管理層指引與風險因子。
- **本機文件上傳管道 (`/api/parse-document`)**：
  - 前端 [`components/prompt-form.tsx`](../../components/prompt-form.tsx) 提供 📎 檔案上傳按鈕，支援最大 25MB 文件秒級解析，解析後自動注入上下文並提供視覺化卡片 [`FinancialReportCard`](../../components/stocks/financial-report-card.tsx)。

---

## 4. 🎙️ 全球法人說明會與 Earnings Calls 全維度情報 (台/美/日/韓/其他)

- **`showEarningsCalls` ➔ `<EarningsCallCard />` ([`lib/quant/earnings-call.ts`](../../lib/quant/earnings-call.ts))**：
  - **BigGo Finance 官方 API 深度聚合 (`https://api.biggo.com/api/v1/finance/stock/earnings-calls`)**：
    - 多視窗滑動並行檢索（-18 天至 +18 天，6 日閉區間視窗並行請求），涵蓋台股 (TWSE/TPEX)、美股 (NYSE/NASDAQ)、日本 (JPX)、韓國 (KRX) 及其他國際市場完整法說會清單。
    - 個股專屬法說檢索 (`q=${symbol}&page=1&size=50` 與 `/stock/${stock_id}/earnings-calls/list`)，精準支援台股 4 碼代號、中文公司名稱、美股代號、SpaceX (`SPCX`)、日股 (如 `7203.T` 豐田、`9984.T` 軟銀) 與韓股 (如 `005930.KS` 三星電子、`000660.KS` SK 海力士)。
    - 深度情報萃取：整合會議詳細展望 (`/detail`)、投行分析師 Q&A 精華、官方簡報 PDF 直連 (`/file?type=slides`) 與證交所/官方影音回放串流 (`/file?type=video`)。
    - 跨時區精準判定：支援台北 (CST, UTC+8)、美東 (ET, UTC-4/-5)、東京 (JST, UTC+9)、首爾 (KST, UTC+9) 雙時區換算與跨日標註。
  - 即時計算會議狀態（🔴 **進行中**、🟡 **今日召開**、🔵 **即將舉行**、⚪ **歷史回放**）。
  - 提供官方影音直播/錄音 Webcast 外鏈、法說會簡報 (PDF) 下載與 BigGo 專頁直達連結。
- **動態檢索端點 (`/api/earnings-calls`)**：
  - 支援前端即時異步查詢任何股票代號或市場篩選（`ALL`, `TW`, `US`, `JP`, `KR`, `OTHER`），具備 300 秒邊緣快取與 singleflight 去重。
- **⚡ 2MD AnyDoc 簡報一鍵 AI 深度解析 ([`app/api/parse-earnings-deck/route.ts`](../../app/api/parse-earnings-deck/route.ts))**：
  - 點擊卡片「AI 深度解析簡報」即可在對話流內直接展開結構化經營層指引（Guidance）、資本支出（CapEx）與產能擴充展望。
