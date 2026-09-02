---
name: security-audit
description: Perform comprehensive full-codebase security audits, vulnerability assessments, secret detection, API/SSRF inspection, prompt injection defense, and dependency vulnerability scans for Next.js / AI applications.
license: MIT
metadata:
  author: stockbot
  version: "1.0"
---

# Security Audit Skill

This skill guides Antigravity agents in conducting end-to-end defensive security reviews and vulnerability assessments across Next.js, React Server Components (RSC), AI/LLM SDK integrations, and quantitative finance pipelines.

---

## 🎯 Audit Scope & Objectives

When invoked, execute a structured 7-layer security assessment:

```
[Layer 1: Secrets & Env] ──> [Layer 2: API & SSRF] ──> [Layer 3: AI & Prompt Injection]
           │                                                    │
[Layer 4: Client & XSS] ───> [Layer 5: Dependencies] ──> [Layer 6: Headers & CSP]
                                    │
                         [Layer 7: Quantitative & Math]
```

---

## 📋 Step-by-Step Audit Procedure

### 1. 🔑 Secrets & Credentials Exposure
- Scan all tracked files and git history for hardcoded API keys, private IPs, fallback bearer tokens, or internal hostnames.
- Verify `.gitignore` rules cover `.env`, `.env.local`, `*.env`, `.vercel`, `*.pem`, and build caches.
- Ensure all external service URLs and credentials are fed strictly via `process.env` with fallback to safe mock/null behaviors rather than internal network addresses.

### 2. 🛡️ API Endpoints & Server Actions (SSRF / DoS / Input Validation)
- **Parameter Validation**: Verify every `GET`/`POST` route validates query and body payloads using Zod or strict regex before processing.
- **SSRF Prevention**: Inspect all dynamic `fetch()` and `http.request()` calls. Ensure user-supplied URLs or query parameters (e.g. `taskId`, target web addresses) are strictly sanitized, validated against allowlists, or URL-encoded.
- **Rate Limiting & File Upload Limits**: Check endpoints accepting large payloads (e.g. `/api/parse-document`, `/api/stock-analysis`) for size limits, payload verification, and abuse protection.
- **Error Information Leakage**: Verify API catch blocks do not leak stack traces, database strings, or internal microservice error details in production responses.

### 3. 🧠 AI & Prompt Injection Guardrails
- **Prompt Injection Defense**: Check where user input or third-party untrusted content (e.g. scraped HTML, parsed PDF text) is injected into LLM system prompts. Use clear delimiter boundaries (e.g. `<untrusted_content>` tags) and explicit defensive system instructions.
- **Model Output Validation**: Ensure LLM tool calling arguments are strictly typed and parsed with schema validators (e.g. Zod) before executing financial operations.
- **Failover Credential Isolation**: Ensure dynamic multi-tier fallback routers isolate client keys from server master keys.

### 4. 💻 Client-side Security & Data Storage
- **XSS & HTML Rendering**: Verify Markdown renderers (`react-markdown`) do not enable raw HTML execution (`rehype-raw`) without proper HTML sanitization (e.g. `DOMPurify` / `rehype-sanitize`).
- **Dangerous HTML**: Audit all occurrences of `dangerouslySetInnerHTML`.
- **LocalStorage & Session Privacy**: Audit keys stored in browser storage (`localStorage`). Ensure sensitive session tokens or secrets are not exposed to unauthenticated client scripts.
- **Third-party Widgets**: Verify embedded external scripts (e.g. TradingView widgets) are loaded over HTTPS and cannot execute arbitrary script payloads.

### 5. 📦 Supply Chain & Dependency CVEs
- Execute `pnpm audit` / `npm audit` to identify known CVEs in direct and transitive dependencies.
- Flag critical/high vulnerabilities (e.g. Next.js server component DoS, cache poisoning, regex ReDoS).
- Propose minimal, non-breaking upgrade paths in `package.json`.

### 6. 🌐 HTTP Security Headers & Infrastructure
- Verify `next.config.js` configures essential security response headers:
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options: SAMEORIGIN` or `DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
  - `Strict-Transport-Security` (HSTS)
- Verify `remotePatterns` in Next.js image configuration are strictly scoped to trusted image hosts.

### 7. 📐 Quantitative Engine Numerical Safety
- Verify numerical formulas (DCF, Black-Scholes, CAPM, WACC, SEPA) guard against:
  - Division by zero
  - `NaN` / `Infinity` propagation
  - Negative values in logarithms / square roots
  - Array out-of-bounds indexing

---

## 📊 Deliverables & Reporting Format

Every audit run must produce a structured report containing:
1. **Executive Summary**: Overall risk score, summary of audited files, and critical finding counts.
2. **Detailed Findings Table**: Categorized by severity (`Critical`, `High`, `Medium`, `Low`, `Informational`), affected files (with clickable `file://` links), vulnerability descriptions, and proof of concept / root causes.
3. **Actionable Remediation Plan**: Immediate hotfixes, configuration adjustments, and dependency upgrades.
