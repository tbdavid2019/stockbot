# AGENTS.md - Repository Guidelines for Stockbot

This document contains rules, architectural guidelines, and constraints for AI coding agents working within the `stockbot` repository.

---

## 🚨 Critical Rules for AI Agents (MUST ALWAYS FOLLOW)

### 1. 🛑 Zero-Excuse & Zero-Arguing Policy
- **NEVER** argue with the user or lecture the user by saying "身為 AI 助理，我無法修改模型權重/訓練資料".
- When the user provides feedback or asks for live facts:
  1. Immediately use live search tools (`searchWeb2MD` / 2MD API) to find real facts.
  2. Answer based on live search results.
  3. Keep responses objective, grounded, and concise.

### 2. 🌐 Zero-Hallucination & Live Web Verification
- Internal training memory is stale. Never rely on internal weights to guess:
  - Whether a company is listed or has an active IPO (e.g. SpaceX, Stripe).
  - Live stock prices, cryptocurrency quotes, or market indices.
  - Recent breaking news or corporate earnings.
- Always use `searchFinancialWeb` (2MD Live Search) or TradingView components.

### 3. ⚙️ Endpoints Architecture
- **Primary LLM**: `https://nen.com.tw/v1` (Model: `gpt-5.6-luna`, Key: `sk-ldlVxszyveuokby4LaVWDp5wXCnTVNlbNjRKvZyWPPYqAJvh`).
- **Fallback LLM (Groq)**: `https://api.groq.com/openai/v1` (Model: `openai/gpt-oss-20b`, Key: `process.env.GROQ_API_KEY`).
- **2MD Fast Search**:
  - Primary: `https://2md.aiurl.tw`
  - Backup 1: `https://2md.glsoft.ai`
  - Backup 2: `https://create360.ai`
- **AI Hedge Fund API**: `http://dns.glsoft.ai:6000/api/analysis`.

### 4. 📐 UI 卡片與文字相對位置鐵律 (Card Positioning Policy)
- Stockbot 介面設計中，所有圖表、分析報告、走勢圖、新聞與財務卡片（如 `<StockAnalysis />`, `<StockChart />`, `<StockNews />`, `<WebSearchResults />`）**一律渲染於文字訊息的上方 (ABOVE)**。
- 助理在產生伴隨說明文字時：
  - **一律使用「以上是...」、「如上方所示...」、「如上圖所示...」**。
  - **嚴禁使用「以下是...」或「如下所示...」**！

