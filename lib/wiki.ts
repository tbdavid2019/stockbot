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

/**
 * Enforces mandatory document structure rule from SKILL.md:
 * 1. ALWAYS start with `# Document Title` on the very first line (unless YAML frontmatter is used).
 * 2. Strip any conversational preamble/small talk before `# Title`.
 * 3. Ensure [TOC], blockquotes, and alerts are placed AFTER `# Title`.
 */
function sanitizeWikiMarkdown(markdown: string, fallbackTitle?: string): string {
  let text = markdown.trim()

  // 1. If text starts with YAML frontmatter (--- ... ---), keep it intact
  if (text.startsWith('---')) {
    return text
  }

  // 2. Strip any conversational chatter before the first '# ' (Level-1 heading)
  const firstH1Index = text.indexOf('# ')
  if (firstH1Index > 0) {
    text = text.substring(firstH1Index).trim()
  } else if (firstH1Index === -1) {
    // No H1 heading found, prepend one using fallbackTitle
    const title = fallbackTitle || '投資研究分析報告'
    text = `# ${title}\n\n${text}`
  }

  // 3. Ensure [TOC] is not erroneously placed before the first heading
  if (text.startsWith('[TOC]')) {
    text = text.replace(/^\[TOC\]\s*/i, '').trim()
  }

  // 4. For long articles (>400 chars), ensure [TOC] is placed after heading/summary
  if (!text.includes('[TOC]') && text.length > 400) {
    const h1WithQuoteMatch = text.match(/^(#\s+[^\n]+\n+(?:>[^\n]+\n*)+)/m)
    if (h1WithQuoteMatch) {
      text = text.replace(
        h1WithQuoteMatch[0],
        `${h1WithQuoteMatch[0].trim()}\n\n[TOC]\n\n`
      )
    } else {
      const firstHeadingMatch = text.match(/^#\s+[^\n]+/m)
      if (firstHeadingMatch) {
        text = text.replace(
          firstHeadingMatch[0],
          `${firstHeadingMatch[0]}\n\n[TOC]\n`
        )
      }
    }
  }

  return text
}

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

    // Apply strict SKILL.md document structure formatting
    const text = sanitizeWikiMarkdown(options.markdown, options.title)

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
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'stockbot-wiki-publisher/2.0'
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
