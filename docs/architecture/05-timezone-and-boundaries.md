# 05. 午夜邊界防護與時區規範 (Timezone & Boundary Resilience)

## 1. ⏱️ 閉區間當日終點 (End of Day: 23:59:59.999) 鐵律

- 當查詢日期範圍（如 9/1 ~ 9/9）時，結束時間必須透過 [`lib/utils.ts`](../../lib/utils.ts) 的 `getEndOfDay` 錨定在 **`23:59:59.999`**。
- **嚴禁**以 `new Date('YYYY-MM-DD')`（預設 00:00:00）作結尾，否則 9/9 整天日間交易將全被過濾吃掉。

---

## 2. 🌐 市場時區嚴格隔離

- 台股三大法人籌碼 ([`lib/quant/institutional.ts`](../../lib/quant/institutional.ts)) 與總經日曆 ([`lib/quant/investing-macro.ts`](../../lib/quant/investing-macro.ts)) 一律強制指定 **`Asia/Taipei`**。
- 美股因子基準 ([`lib/quant/us-fddk.ts`](../../lib/quant/us-fddk.ts)) 一律指定 **`America/New_York`**。
- 徹底杜絕伺服器 UTC 清晨時段產生的 8 小時換日倒退。

---

## 3. 🏛️ TPEX 櫃買資料真偽日核實與快取 TTL

- 櫃買三大法人資料必須以 `parseTpexDate` 解析 API 原生民國年日期，嚴禁在盤後資料公布前硬套今日日期。
- 所有盤中/盤後快取必須設置適當 TTL（如 10 分鐘），防止跨午夜毒化快取 (Cache Poisoning)。

---

## 4. 📅 日曆日跨日與日期溢出防護

- 對話時間以自然日曆日計算（`startOfToday` vs `startOfTarget` 兩者午夜零點差），嚴禁使用已流逝 24 小時除法。
- 財報季報日加算嚴格限制於當月最大天數（clamped day），防止 `setMonth` 月底溢出至次月。
