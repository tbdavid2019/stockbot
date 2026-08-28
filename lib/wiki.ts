/**
 * David888 Wiki Publisher Helper
 * Base API: https://wiki.david888.com/api
 * Spec: https://wiki.david888.com/.well-known/agent-skills/david888-wiki-publisher/SKILL.md
 */

export interface WikiPublishOptions {
  slug?: string
  title?: string
  markdown: string
  theme?:
    | 'ayu-light'
    | 'bauhaus'
    | 'botanical'
    | 'catppuccin-latte'
    | 'catppuccin-macchiato'
    | 'claude-canvas'
    | 'green-simple'
    | 'kanagawa'
    | 'neo-brutalism'
    | 'newsprint'
    | 'notion-clean'
    | 'organic'
    | 'playful-geometric'
    | 'professional'
    | 'retro'
    | 'shopify-mint'
    | 'sketch'
    | 'terminal'
    | 'tokyo-night'
    | 'x-ai'
  width?: '100%' | '960px' | '1200px' | '1440px'
  publicIndex?: boolean
}

export interface WikiPublishResult {
  success: boolean
  shareUrl?: string
  presentUrl?: string
  bookUrl?: string
  internalUrl?: string
  path?: string
  error?: string
}

const WIKI_API_BASE = process.env.WIKI_API_BASE || 'https://wiki.david888.com/api'

export async function publishToWiki(
  options: WikiPublishOptions
): Promise<WikiPublishResult> {
  try {
    const rawSlug = options.slug || options.title || `stockbot-report-${Date.now()}`
    const path =
      rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || `report-${Date.now()}`

    const endpoint = `${WIKI_API_BASE.replace(/\/+$/, '')}/${encodeURIComponent(path)}`

    // Ensure markdown has title and TOC if missing
    let text = options.markdown.trim()
    if (options.title && !text.startsWith('# ')) {
      text = `# ${options.title}\n\n[TOC]\n\n${text}`
    } else if (!text.includes('[TOC]') && text.length > 500) {
      // Auto insert [TOC] after first heading for long reports
      const firstHeadingMatch = text.match(/^#\s+.+$/m)
      if (firstHeadingMatch) {
        text = text.replace(
          firstHeadingMatch[0],
          `${firstHeadingMatch[0]}\n\n[TOC]\n`
        )
      }
    }

    const payload = {
      text,
      public: true,
      theme: options.theme || 'claude-canvas',
      width: options.width || '100%',
      publicIndex: options.publicIndex ?? true
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'stockbot-wiki-publisher/1.0'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errText = await res.text()
      return {
        success: false,
        error: `Wiki API returned HTTP ${res.status}: ${errText}`
      }
    }

    const data = await res.json()
    // CRITICAL: SKILL.md specifies always use data.shareUrl (never internal edit url)
    const shareUrl = data?.data?.shareUrl || data?.shareUrl
    const internalUrl = data?.data?.url || data?.url

    if (!shareUrl) {
      return {
        success: false,
        error: 'Wiki API response missing shareUrl'
      }
    }

    return {
      success: true,
      shareUrl,
      presentUrl: `${shareUrl}/present`,
      bookUrl: `${shareUrl}/book`,
      internalUrl,
      path
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || String(err)
    }
  }
}
