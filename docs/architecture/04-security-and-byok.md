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

## 4. 🎙️ 法人說明會與美股 Earnings Call 全維度情報

- **`showEarningsCalls` ➔ `<EarningsCallCard />` ([`lib/quant/earnings-call.ts`](../../lib/quant/earnings-call.ts))**：
  - 整合公開資訊觀測站 (MOPS)、證交所 (TWSE)、櫃買 (TPEX) 與美股 Yahoo Finance / 企業 IR 官方數據。
  - 支援全市場日曆概覽與個股精準查詢，即時計算會議狀態（🔴 **進行中**、🟡 **今日召開**、🔵 **即將舉行**、⚪ **歷史回放**）。
  - 提供官方影音直播/錄音 Webcast 外鏈與法說會簡報 (PDF) 下載。
- **⚡ 2MD AnyDoc 簡報一鍵 AI 深度解析 ([`app/api/parse-earnings-deck/route.ts`](../../app/api/parse-earnings-deck/route.ts))**：
  - 點擊卡片「AI 深度解析簡報」即可在對話流內直接展開結構化經營層指引（Guidance）、資本支出（CapEx）與產能擴充展望。
