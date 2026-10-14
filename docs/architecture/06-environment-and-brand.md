# 06. 環境變數規範與品牌資產 (Environment Variables & Brand Assets)

## 1. ⚙️ 環境變數設定規範 (Environment Variables Reference)

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
| **`FALLBACK_2_BASE_URL`** | URL | `https://generativelanguage.googleapis.com/v1beta/openai/` | 第 2 備用端點 Base URL（如 Google Gemini） |
| **`FALLBACK_2_API_KEY`** | Secret | `AIza...` | 第 2 備用端點 API Key（如 `GEMINI_API_KEY`） |
| **`FALLBACK_2_TOOL_MODEL`** | String | `gemini-2.5-flash` | 第 2 備用端點工具模型 |
| **`FALLBACK_2_MODEL`** | String | `gemini-2.5-flash` | 第 2 備用端點文字模型 |
| **`CLEF_PRIMARY_URL`** | URL | `https://clef.create360.ai/v1/systemone` | Clef-Flash System One 主力端點 |
| **`CLEF_FALLBACK_2_URL`** | URL | `https://clef.aiurl.tw/v1/systemone` | Clef-Flash System One 備援端點 2 |
| **`CLEF_FALLBACK_3_URL`** | URL | `https://api.typesafe.ai/v1/systemone` | TypeSafe Jev 官方推論端點 |
| **`TYPESAFE_API_KEY`** | Secret | `sk-...` | TypeSafe 官方 API Key |
| **`OPENAI_DECISIONS_URL`** | URL | `https://api.openai.com/v1/decisions` | OpenAI Decisions API 終極兜底端點 |
| **`OPENAI_DECISIONS_MODEL`**| String | `gpt-6-luna` | OpenAI Decisions 推論模型 |
| **`CLEF_PRIMARY_TIMEOUT_MS`**| Number | `1200` | Clef 主力端點超時預算 (ms) |
| **`CLEF_FALLBACK_TIMEOUT_MS`**| Number | `2500` | Clef 備援端點超時預算 (ms) |
| **`TWOMD_PRIMARY_URL`** | URL | `https://2md.aiurl.tw` | 2MD 即時連網搜尋主端點 |
| **`AI_HEDGE_FUND_HOST`** | Host | `dns.glsoft.ai` | AI Hedge Fund API 主機位置 |
| **`AI_HEDGE_FUND_PORT`** | Port | `6000` | AI Hedge Fund API 端口 |

---

## 2. 🎨 品牌 Logo 與視覺資產

- 目前採用純橘色底、白色「888／Stock Bot」的 `public/stockbot-logo-v3.png`；網站使用 256px 的 `public/stockbot-logo.png`。頁首、聊天頭像、favicon 與 PWA 圖示統一使用此版本。favicon metadata 直接指向 `stockbot-logo.png?v=4`，避免瀏覽器持續優先快取舊 `favicon.ico`。
- TradingView ticker 的外部 iframe 在載入期間會產生內建線條 skeleton；`components/tradingview/ticker-tape.tsx` 保持容器高度但在 iframe ready 前隱藏內容，避免首次載入閃出黑／灰線條。

---

## 3. 🤖 BYOK 即時模型清單與 Gemini Latest

- BYOK 設定在輸入金鑰或變更端點後，透過 `POST /api/byok-models` 即時取得供應商 `/models`；Gemini 使用原生 `v1beta/models`，包含分頁及 `generateContent` 篩選。
- Gemini 預設 `gemini-flash-latest`，由 Google 自動指向最新 Flash；既有官方端點的 `gemini-2.5-flash` 預設設定於讀取時升級為 latest。其他供應商要求明確選擇或手動輸入模型，沿用已儲存的自訂模型。
- 模型清單採 no-store、8 秒逾時、SSRF 校驗與禁止重新導向。金鑰只在請求記憶體中轉送，錯誤回覆不包含上游原始訊息；失敗時顯示重試與手動輸入，保留使用者選項。
- `/models` 的可見性不代表支援工具呼叫；模型選定後仍需測試實際對話能力。
