import { fetchEarningsCallDashboard } from '@/lib/quant/earnings-call'
import { EarningsCallOverview } from '@/components/stocks/earnings-call-overview'

export const runtime = 'edge'
export const preferredRegion = ['hkg1', 'sin1', 'kix1', 'nrt1']
export const dynamic = 'force-dynamic'

export const metadata = {
  title: '法人說明會總覽 (Earnings Calls) - 888 StockBot',
  description:
    '整合 BigGo Finance 全球數據、台灣公開資訊觀測站 (MOPS)、TWSE/TPEX 官方 Webcast、美股 Earnings Call、日本 (JPX) 與韓國 (KRX) 法說會，提供完整日程、簡報下載與 2MD AI 指引萃取。'
}

export default async function EarningsCallPage() {
  let initialData
  try {
    initialData = await fetchEarningsCallDashboard({ market: 'ALL' })
  } catch (err) {
    console.error('Failed to load initial earnings call dashboard:', err)
  }
  return <EarningsCallOverview initialData={initialData} />
}
