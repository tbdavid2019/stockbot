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
- **Primary LLM**: `https://nen.com.tw/v1` (Model: `deepseek-v4-flash`, Key: `sk-XqYJN7YDjomSEeOPn9GsHvSpspYLuQrxdgQc2zcA3kvuZD34`).
- **Fallback LLM**: `https://api.groq.com/openai/v1` (`GROQ_API_KEY`).
- **2MD Fast Search**:
  - Primary: `https://2md.aiurl.tw`
  - Backup 1: `https://2md.glsoft.ai`
  - Backup 2: `https://create360.ai`
- **AI Hedge Fund API**: `http://dns.glsoft.ai:6000/api/analysis`.
