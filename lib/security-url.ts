/**
 * SSRF 防禦與安全 Base URL 驗證模組
 * 防止惡意使用者透過 BYOK 自訂端點探測或攻擊內部網路與雲端中繼服務 (169.254.169.254)
 */

const TRUSTED_DOMAINS = [
  'api.openai.com',
  'api.groq.com',
  'generativelanguage.googleapis.com',
  'api.deepseek.com',
  'openrouter.ai',
  'api.together.xyz',
  'api.fireworks.ai',
  'api.mistral.ai',
  'api.anthropic.com',
  'api.perplexity.ai'
]

// 阻擋常見的 DNS 萬用字元與繞過服務 (如 127.0.0.1.nip.io, 169.254.169.254.sslip.io)
const FORBIDDEN_DNS_REBIND_SUFFIXES = [
  '.nip.io',
  '.sslip.io',
  '.xip.io',
  '.traefik.me',
  '.localtest.me',
  '.vcap.me',
  '.lvh.me'
]

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => Number(p))
  if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) {
    return false
  }

  const [p0, p1] = parts
  // 0.0.0.0/8
  if (p0 === 0) return true
  // 10.0.0.0/8
  if (p0 === 10) return true
  // 127.0.0.0/8 (Loopback)
  if (p0 === 127) return true
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata)
  if (p0 === 169 && p1 === 254) return true
  // 172.16.0.0/12
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true
  // 192.168.0.0/16
  if (p0 === 192 && p1 === 168) return true
  // 100.64.0.0/10 (CGNAT)
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (p0 >= 224) return true

  return false
}

function isPrivateIPv6(cleanIp: string): boolean {
  const lower = cleanIp.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  // Link-local: fe80::/10
  if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
    return true
  }
  // Unique local: fc00::/7 (fc00:: - fdff::)
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true
  }
  // IPv6-mapped IPv4: ::ffff:127.0.0.1 or ::ffff:7f00:1 or ::ffff:a9fe:a9fe (169.254)
  if (lower.startsWith('::ffff:')) {
    const v4Part = lower.slice(7)
    if (v4Part.includes('.')) {
      return isPrivateIPv4(v4Part)
    }
    // Hex IPv4 representation (e.g. 7f00:1 for 127.0.0.1, a9fe:a9fe for 169.254.169.254)
    if (v4Part.startsWith('7f') || v4Part.startsWith('a9fe') || v4Part.startsWith('0a') || v4Part.startsWith('c0a8')) {
      return true
    }
  }
  return false
}

export function isSafeApiBaseUrl(urlString: string): { safe: boolean; reason?: string } {
  if (!urlString || typeof urlString !== 'string') {
    return { safe: false, reason: '未提供 Base URL' }
  }

  const trimmed = urlString.trim()

  try {
    const url = new URL(trimmed)

    // 必須為 HTTPS (僅在明確的 NODE_ENV=development 允許本機測試)
    if (url.protocol !== 'https:') {
      if (process.env.NODE_ENV === 'development' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
        return { safe: true }
      }
      return { safe: false, reason: '安全性限制：API 端點必須使用 HTTPS 加密協定' }
    }

    // 檢查是否包含憑證資訊 (user:pass@)
    if (url.username || url.password) {
      return { safe: false, reason: 'Base URL 不得直接包含帳號密碼資訊' }
    }

    const rawHostname = url.hostname.toLowerCase()
    // 去除 IPv6 方括號 (例如 [::1] -> ::1)
    const hostname = rawHostname.replace(/^\[|\]$/g, '')

    // 信任的知名 AI 提供商直接放行
    if (TRUSTED_DOMAINS.some(trusted => hostname === trusted || hostname.endsWith(`.${trusted}`))) {
      return { safe: true }
    }

    // 禁止本機與內部網域名稱
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan')
    ) {
      return { safe: false, reason: '禁止存取本機或區域網路端點' }
    }

    // 阻擋常見的 DNS 萬用字元服務 (nip.io, sslip.io 等)
    for (const suffix of FORBIDDEN_DNS_REBIND_SUFFIXES) {
      if (hostname.endsWith(suffix) || hostname === suffix.slice(1)) {
        return { safe: false, reason: '禁止使用 DNS Rebinding / Wildcard 服務端點' }
      }
    }

    // 檢查 IPv4 位址
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      if (isPrivateIPv4(hostname)) {
        return { safe: false, reason: '禁止存取私有 IP、內部保留位址或雲端中繼服務 (Metadata)' }
      }
    }

    // 檢查 IPv6 位址
    if (hostname.includes(':')) {
      if (isPrivateIPv6(hostname)) {
        return { safe: false, reason: '禁止存取 IPv6 本機迴路、Link-local 或私有位址' }
      }
    }

    // 檢查包含在網域名稱內的私有 IP 樣式 (例如 127-0-0-1.example.com 或 169.254.169.254.nip.io 等)
    if (/(^|[.-])(127|10|192\.168|169\.254)($|[.-])/.test(hostname)) {
      return { safe: false, reason: '禁止存取指向內部私有 IP 的網域名稱' }
    }

    return { safe: true }
  } catch {
    return { safe: false, reason: 'Base URL 格式無效，請確認為正確的 HTTPS 網址' }
  }
}
