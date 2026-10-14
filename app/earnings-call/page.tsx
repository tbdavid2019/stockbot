import { fetchEarningsCallDashboard } from '@/lib/quant/earnings-call'
import { EarningsCallOverview } from '@/components/stocks/earnings-call-overview'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export const metadata = {
  title: '法人說明會總覽 (Earnings Calls) - 888 StockBot',
  description:
    '整合台灣公開資訊觀測站 (MOPS)、TWSE/TPEX 官方 Webcast 與美股 Earnings Call，提供法說會日程、簡報下載與 2MD AI 指引萃取。'
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
