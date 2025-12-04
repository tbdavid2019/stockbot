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

股票機器人是一個由 AI 驅動的聊天機器人，它利用 Groq 上的 Llama3 70b 模型、Vercel 的 AI SDK 和 TradingView 的即時小工具，通過對話方式提供即時、互動式圖表和界面，專門根據您的請求定制。Groq 的高速處理能力使工具調用和響應幾乎瞬間完成，允許通過兩個 API 調用序列與專門的提示返回響應。現在已支援台灣股票市場查詢！

> [!IMPORTANT]
>  注意：股票機器人可能提供不準確的信息，並不提供投資建議。它僅供娛樂和教學使用。

## 功能特點

- 🤖 **即時 AI 聊天機器人**：與由 Llama3 70b 驅動的 AI 互動，通過自然語言對話請求股票新聞、信息和圖表
- 📊 **互動式股票圖表**：接收幾乎即時的、上下文感知的響應，包含承載實時數據的互動式 TradingView 圖表
- 🔄 **自適應界面**：動態渲染 TradingView UI 組件，為您的特定查詢定制金融界面
- ⚡ **Groq 驅動的性能**：利用 Groq 的尖端推理技術，實現近乎即時的響應和無縫用戶體驗
- 🌐 **多資產市場覆蓋**：訪問股票、外匯、債券和加密貨幣的全面數據和分析
- 🇹🇼 **台灣股票市場支持**：現已支援台灣股票市場查詢，包括台積電等台灣上市公司

## Interfaces
| Description | Widget |
|-------------|--------|
| **Heatmap of Daily Market Performance**<br>Visualize market trends at a glance with an interactive heatmap (now supports US / Taiwan / Taiwan 50 / Japan / Hong Kong / UK / Germany / France / Israel / Korea / China / Australia / India / Brazil / Canada). | ![Heatmap of Daily Market Performance](https://github.com/user-attachments/assets/2e3919a3-280b-4be4-adcd-a1ff636bff3e) |
| **Breakdown of Financial Data for Stocks**<br>Get detailed financial metrics and key performance indicators for any stock. | ![Breakdown of Financial Data for Stocks](https://github.com/user-attachments/assets/c1c32dac-8295-4efb-ac1e-2eea8a89e7db) |
| **Price History of Stock**<br>Track the historical price movement of stocks with customizable date ranges. | ![Price History of Stock](https://github.com/user-attachments/assets/f588068e-4d95-4188-96fd-866d355c993e) |
| **Candlestick Stock Charts for Specific Assets**<br>Analyze price patterns and trends with detailed candlestick charts. | ![Candlestick Stock Charts for Specific Assets](https://github.com/user-attachments/assets/ce9ea4a8-a1fe-4ce7-be60-3f5d64d50ced) |
| **Top Stories for Specific Stock**<br>Stay informed with the latest news and headlines affecting specific companies. | ![Top Stories for Specific Stock](https://github.com/user-attachments/assets/fa0693f4-8eca-4d5c-90e7-42afda0d8acc) |
| **Market Overview**<br>Shows an overview of today's stock, futures, bond, and forex market performance including change values, Open, High, Low, and Close values. | ![Market Overview](https://github.com/user-attachments/assets/79048f3b-9153-41f9-8de5-6b3d45f331dd) |
| **Stock Screener to Find New Stocks and ETFs**<br>Discover new companies with a stock screening tool. | ![Stock Screener to Find New Stocks and ETFs](https://github.com/user-attachments/assets/8ecadec9-69a1-4e18-a9fe-7b30df9f6ff5) |
| **Trending Stocks**<br>Shows the top five gaining, losing, and most active stocks for the day. | ![Trending Stocks](https://github.com/user-attachments/assets/848c1ebf-7828-4116-a041-6f0ba7156bd5) |
| **ETF Heatmap**<br>Shows a heatmap of today's ETF market performance across sectors and asset classes. | ![ETF Heatmap](https://github.com/user-attachments/assets/cb2b29d9-acb7-4c8f-90c7-0390e72907f6) |

## Quickstart

> [!IMPORTANT]
> To use StockBot, you can use a hosted version at [tbdavid-stockbot.vercel.app](https://tbdavid-stockbot.vercel.app/).
> Alternatively, you can run StockBot locally using the quickstart instructions.


You will need a Groq API Key to run the application. You can obtain one [here on the Groq console](https://console.groq.com/keys).

To get started locally, you can run the following:

```bash
cp .env.example .env.local
```

Add your Groq API key to .env.local, then run:

```bash
pnpm install
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).



## Credits

This app was originally developed by [Benjamin Klieger](https://x.com/benjaminklieger) at [Groq](https://groq.com) and uses the AI Chatbot template created by Vercel: [Github Repository](https://github.com/vercel/ai-chatbot). Taiwan stock market support was added by [tbdavid2019](https://github.com/tbdavid2019).
