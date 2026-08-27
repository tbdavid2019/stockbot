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
>  注意：股票機器人可能提供不準確的信息，並不提供投資建議。它僅供娛樂和教學使用。

## 功能特點

- 🤖 **即時 AI 聊天機器人**：與高速回應的 AI 互動，通過自然語言對話請求股票新聞、信息和圖表
- 📊 **互動式股票圖表**：接收幾乎即時的、上下文感知的響應，包含承載實時數據的互動式 TradingView 圖表
- 🔄 **自適應界面**：動態渲染 TradingView UI 組件，為您的特定查詢定制金融界面
- ⚡ **Groq 驅動的性能**：利用 Groq 的尖端推理技術，實現近乎即時的響應和無縫用戶體驗
- 🌐 **多資產市場覆蓋**：訪問股票、外匯、債券和加密貨幣的全面數據和分析
- 🇹🇼 **台灣股票市場支持**：現已支援台灣股票市場查詢，包括台積電等台灣上市公司
- 🤖 **AI 投資分析** (新功能)：整合 AI Hedge Fund API，提供傳奇投資大師（巴菲特、葛拉漢、乾克曼等）的專業投資建議

## AI 投資分析功能

StockBot 整合了 AI Hedge Fund API，可以模擬多位傳奇投資大師的投資風格，為您提供專業的股票分析建議。

### 使用方式

在聊天中直接詢問：
- "TSLA 值得買嗎？"
- "分析一下 NVDA"
- "Should I buy AAPL?"

### 分析師團隊

| 類別 | 分析師 |
|------|--------|
| 📊 價值投資大師 | Ben Graham、Warren Buffett、Charlie Munger、Bill Ackman、Peter Lynch、Phil Fisher、Michael Burry |
| 🚀 成長與創新 | Cathie Wood |
| 📈 技術與情緒分析 | Technical Analyst、Sentiment Analyst、Nancy Pelosi、WSB |
| 📐 基本面與估值 | Fundamentals Analyst、Valuation Analyst |

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

## Interfaces
| Description | Widget |
|-------------|--------|
| **AI Investment Analysis** (NEW)<br>Get professional investment advice and multi-round round table debates from legendary investors like Warren Buffett, Cathie Wood, Michael Burry, and more. | AI Hedge Fund API (dns.glsoft.ai:6000) |
| **Heatmap of Daily Market Performance**<br>Visualize market trends at a glance with an interactive heatmap. Supported markets: US (S&P 500), Germany, Australia, Brazil, Canada, Israel. | ![Heatmap of Daily Market Performance](https://github.com/user-attachments/assets/2e3919a3-280b-4be4-adcd-a1ff636bff3e) |
| **Breakdown of Financial Data for Stocks**<br>Get detailed financial metrics and key performance indicators for any stock. | ![Breakdown of Financial Data for Stocks](https://github.com/user-attachments/assets/c1c32dac-8295-4efb-ac1e-2eea8a89e7db) |
| **Price History of Stock**<br>Track the historical price movement of stocks with customizable date ranges. | ![Price History of Stock](https://github.com/user-attachments/assets/f588068e-4d95-4188-96fd-866d355c993e) |
| **Candlestick Stock Charts for Specific Assets**<br>Analyze price patterns and trends with detailed candlestick charts. | ![Candlestick Stock Charts for Specific Assets](https://github.com/user-attachments/assets/ce9ea4a8-a1fe-4ce7-be60-3f5d64d50ced) |
| **Top Stories for Specific Stock**<br>Stay informed with the latest news and headlines affecting specific companies. | ![Top Stories for Specific Stock](https://github.com/user-attachments/assets/fa0693f4-8eca-4d5c-90e7-42afda0d8acc) |
| **Market Overview**<br>Shows an overview of today's stock, futures, bond, and forex market performance including change values, Open, High, Low, and Close values. | ![Market Overview](https://github.com/user-attachments/assets/79048f3b-9153-41f9-8de5-6b3d45f331dd) |
| **Stock Screener to Find New Stocks and ETFs**<br>Discover new companies with a stock screening tool. | ![Stock Screener to Find New Stocks and ETFs](https://github.com/user-attachments/assets/8ecadec9-69a1-4e18-a9fe-7b30df9f6ff5) |
| **Trending Stocks**<br>Shows the top five gaining, losing, and most active stocks for the day. | ![Trending Stocks](https://github.com/user-attachments/assets/848c1ebf-7828-4116-a041-6f0ba7156bd5) |
| **ETF Heatmap**<br>Shows a heatmap of today's ETF market performance across sectors and asset classes. | ![ETF Heatmap](https://github.com/user-attachments/assets/cb2b29d9-acb7-4c8f-90c7-0390e72907f6) |

## LLM 與多階層備援設定 (LLM & Multi-Tier Fallback Configuration)

StockBot 支援 **無限階層動態容錯路由 (Multi-Tier Dynamic Failover Router)**，並將模型拆分為兩大職責：
- **`TOOL_MODEL` (工具模型)**：專用於 `streamUI` 的 Function Calling、意圖識別與圖表/分析卡片調用。
- **`MODEL` (文字模型)**：專用於 `generateCaption` 的流暢繁體中文對話與總結生成。

### 常用環境變數一覽

```bash
# 1. 主要端點 (Primary LLM - 如 Nen / gpt-5.6-luna)
PRIMARY_BASE_URL=https://nen.com.tw/v1
PRIMARY_API_KEY=your_primary_api_key
PRIMARY_TOOL_MODEL=gpt-5.6-luna
PRIMARY_MODEL=gpt-5.6-luna

# 2. 第 1 備用端點 (Fallback #1 - 如 Groq)
FALLBACK_1_BASE_URL=https://api.groq.com/openai/v1
FALLBACK_1_API_KEY=gsk_your_groq_api_key
FALLBACK_1_TOOL_MODEL=openai/gpt-oss-20b
FALLBACK_1_MODEL=openai/gpt-oss-20b

# 3. 第 2 備用端點 (Fallback #2 - 如 OpenAI 官方)
FALLBACK_2_BASE_URL=https://api.openai.com/v1
FALLBACK_2_API_KEY=sk-proj-your_openai_key
FALLBACK_2_TOOL_MODEL=gpt-4o-mini
FALLBACK_2_MODEL=gpt-4o-mini

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



## Credits

This app was originally developed by [Benjamin Klieger](https://x.com/benjaminklieger) at [Groq](https://groq.com) and uses the AI Chatbot template created by Vercel: [Github Repository](https://github.com/vercel/ai-chatbot). Taiwan stock market support was added by [tbdavid2019](https://github.com/tbdavid2019).
