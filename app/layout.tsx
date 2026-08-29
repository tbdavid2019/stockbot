import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

import '@/app/globals.css'
import { cn } from '@/lib/utils'
import { Providers } from '@/components/providers'
import { Header } from '@/components/header'
import { Toaster } from '@/components/ui/sonner'
import { DocumentLocale } from '@/components/document-locale'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bot.david888.com'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '888 StockBot - 即時股票圖表與市場分析',
    template: `%s | 888 StockBot`
  },
  description:
    '提供 TradingView 互動式走勢圖、台美股即時報價、多輪市場分析與 2MD 即時連網搜尋。',
  keywords: [
    '888 StockBot',
    'StockBot',
    'AI 股票機器人',
    'TradingView',
    '台股即時報價',
    '美股走勢圖',
    'AI 投資分析',
    '巴菲特分析',
    '2MD 搜尋'
  ],
  authors: [{ name: 'david888.com', url: 'https://david888.com' }],
  creator: 'david888.com',
  publisher: 'david888.com',
  alternates: {
    canonical: 'https://bot.david888.com'
  },
  openGraph: {
    title: '888 StockBot - 即時股票圖表與市場分析',
    description:
      '提供 TradingView 互動式走勢圖、台美股即時報價、多輪市場分析與 2MD 即時連網搜尋。',
    url: 'https://bot.david888.com',
    siteName: '888 StockBot',
    locale: 'zh_TW',
    type: 'website',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: '888 StockBot - 即時股票圖表與市場分析'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '888 StockBot - 即時股票圖表與市場分析',
    description:
      '提供 TradingView 互動式走勢圖、台美股即時報價、多輪市場分析與 2MD 即時連網搜尋。',
    site: '@david888',
    creator: '@david888',
    images: ['/twitter-image.png']
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '888 StockBot',
    url: 'https://bot.david888.com',
    description:
      '提供 TradingView 互動式走勢圖、台美股即時報價、多輪市場分析與 2MD 即時連網搜尋。',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  }

  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={cn(
          'font-sans antialiased',
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <Toaster position="top-center" />
        <Providers
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <DocumentLocale />
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex flex-col flex-1 bg-muted/50">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
