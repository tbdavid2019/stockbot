# 03. 原生量化金融與市場數據情報 (Quant & Market Intelligence)

## 1. 📐 原生量化金融分析 (Native Quantitative Finance)

- **DCF 估值與敏感度分析 ([`lib/quant/valuation.ts`](../../lib/quant/valuation.ts))**：
  - 提供 5 年 FCFF DCF、CAPM/WACC、同業 P/E、EV/EBITDA、EV/Sales 與 WACC × 終值成長率 5×5 敏感度矩陣。
  - 缺少 beta 時使用明確標示的產業預設，負 EBITDA 時不使用無效 EV/EBITDA。
- **SEPA 動能策略與 VCP 型態 ([`lib/quant/sepa.ts`](../../lib/quant/sepa.ts))**：
  - 提供 Minervini 八項 Trend Template、Stage 1–4、VCP 型態與風險式部位大小。
- **期權定價與損益曲線 ([`lib/quant/black-scholes.ts`](../../lib/quant/black-scholes.ts))**：
  - 提供 Black-Scholes 多腿策略、Greeks（Delta, Gamma, Theta, Vega）與到期/理論損益曲線。
- **微觀結構與流動性分析 ([`lib/quant/microstructure.ts`](../../lib/quant/microstructure.ts))**：
  - 提供 Amihud 流動性指標、年化 float turnover、平方根市場衝擊與 ETF NAV divergence。
  - 上游缺少資料時卡片顯示 `—` 或「待確認」，禁止使用展示用假數字。

---

## 2. ⛓️ DeepEar 宏觀邏輯傳導鏈與 AlphaEar 訊號證偽機制

- **`showTransmissionChain` ➔ `<TransmissionChainCard />`**：
  - 串接 `https://deepear.vercel.app/latest.json` 與因果傳導引擎。
  - 分析「一階總經/事件觸發 ➔ 二階產業鏈傳導 ➔ 三階企業獲利兌現」多層級連鎖反應，包含利好/利空/中性衝擊標籤與情緒/信心度打分。
- **`trackInvestmentSignal` ➔ `<SignalTrackerCard />`**：
  - 實作 4 態投資假說演化（🟢 **Strengthened** / 🟡 **Weakened** / 🔴 **Falsified** / ⚪ **Unchanged**）。
  - 嚴格列出 **核心論點證偽判定點 (Falsification Triggers)**，提供動態部位調整指引。

---

## 3. 📦 歷史凍結數據庫與資產配置因子基準

- **`voidful/tw_stocker` ([`lib/quant/tw-stocker.ts`](../../lib/quant/tw-stocker.ts))**：
  - 全市場台股與 ETF 歷史 OHLCV 靜態數據庫備援，當 Yahoo Finance 無法取得或缺漏時，自動自 GitHub 聚合還原日 K 線與均線計算。
- **`showMacroFactorRegime` ➔ `<MacroFactorRegimeCard />` ([`lib/quant/us-fddk.ts`](../../lib/quant/us-fddk.ts))**：
  - 串接 `voidful/us_fddk` 20 年可稽核歷史凍結數據與 Fama-French 多因子模型。
  - 提供包含扣除 10/50 bps 滑價成本之跨資產 ETF（SPY, QQQ, 80/20 VUG/SHY, 60/40）策略回測對照與 LIVE Paper 實績。

---

## 4. 🏛️ 台灣證交所/櫃買三大法人籌碼情報

- **`showInstitutionalFlow` ➔ `<InstitutionalFlowCard />` ([`lib/quant/institutional.ts`](../../lib/quant/institutional.ts))**：
  - 直接串接 **台灣證券交易所（TWSE T86 / MI_QFIIS）** 與 **證券櫃檯買賣中心（TPEX 3insti）** 官方開放數據。
  - 精確解析：外資及陸資、投信、自營商（自行買賣與避險部位）今日買賣超**張數**、5 日累計買賣超、外資持股佔比 %、連買/連賣天數。
  - 自動判讀籌碼訊號標籤：🟢 **土洋同買**、⚔️ **土洋對作**、🚀 **投信連買認養**、🔴 **三大法人同步賣超**。

---

## 5. 📅 Investing.com 全球總經日曆與防驚群

- **`showEconomicCalendar` ➔ `<EconomicCalendarCard />` ([`lib/quant/investing-macro.ts`](../../lib/quant/investing-macro.ts))**：
  - 透過 2MD Fast Reader 即時抓取重大經濟日曆，萃取包含倒數時間、國家、事件等級、預期值 (Cons.)、前值 (Prev.)、實際值 (Act.)。
  - 同時統整美股三大期指盤前走勢、VIX 恐慌指數、10Y/2Y 美債殖利率曲線、黃金/原油期貨與美元指數 (DXY)，支援即時 Risk-On / Risk-Off 風向評估。
- **2MD 引擎防驚群（Thundering Herd）與熔斷降級防護 ([`lib/2md.ts`](../../lib/2md.ts))**：
  - Singleflight 請求合併避免多請求同時觸發爬蟲。
  - 記憶體快取：搜尋 60 秒、網頁解析 180 秒快取。
  - 端點熔斷機制：連續 2 次失敗進入 30 秒冷卻期。

---

## 6. 🏛️ ToBid 台灣政府標案情報與基本面黑天鵝風控

- **`showGovProcurement` ➔ `<GovBidsCard />` ([`lib/tobid.ts`](../../lib/tobid.ts), [`lib/tobid-entities.ts`](../../lib/tobid-entities.ts), [`components/stocks/gov-bids-card.tsx`](../../components/stocks/gov-bids-card.tsx))**：
  - 串接 ToBid 開放 MCP 端點 (`https://api.tobid.tw/mcp`) 取得 1,400 萬筆台灣政府採購標案、決標金額、歷史投標次數與得標率。
  - **四大 B2G 題材先行指標覆蓋**：軍工/航太（漢翔、龍德造船、雷虎、亞航、全訊）、資服/資安（精誠、零壹、邁達特、凌群、資通、安碁資訊、叡揚、敦陽科、宏碁資訊、大世科）、重電/工程/水資源（中鼎、欣陸、工信、山林水、國統、華城、士電、中興電、亞力、達欣工）、綠能/儲能（泓德能源、雲豹能源、森崴能源、崑鼎、可寧衛）。
  - **基本面黑天鵝風控查核 (`vendor_compliance`)**：自動查驗《政府採購法》第 101 條至 103 條停權（拒絕往來廠商）紀錄，偵測停權即觸發紅色警報。
  - **宿敵競爭與客戶機關集中度**：分析前五大發包客戶機關份額與核心同業競爭同場勝負紀錄（如漢翔 vs 亞航 97 場交手）。
  - **架構防護**：4 秒 AbortController 逾時防護、60 分鐘本機記憶體 LRU 快取與非阻塞優雅降級。
