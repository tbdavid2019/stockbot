import { isSafeApiBaseUrl } from './security-url.ts'

export interface ByokModel {
  id: string
  name: string
}

export class ModelListError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.status = status
  }
}

/** Keys are forwarded only in headers; no cache, logs, redirects or persistence. */
export async function fetchByokModels(
  baseURL: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<ByokModel[]> {
  const safe = isSafeApiBaseUrl(baseURL)
  if (!safe.safe) throw new ModelListError(safe.reason || 'API 端點格式無效', 400)
  const base = new URL(baseURL)
  if (base.search || base.hash) throw new ModelListError('API Base URL 請使用純端點網址', 400)
  const gemini = base.hostname === 'generativelanguage.googleapis.com' &&
    /^\/v1beta\/openai\/?$/.test(base.pathname)
  const endpoint = gemini
    ? new URL('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000')
    : new URL(`${baseURL.replace(/\/+$/, '')}/models`)
  const models = new Map<string, ByokModel>()
  let pageToken = ''
  const seenTokens = new Set<string>()
  do {
    if (pageToken) endpoint.searchParams.set('pageToken', pageToken)
    const response = await fetcher(endpoint, {
      headers: gemini ? { 'x-goog-api-key': apiKey } : { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
      redirect: 'error',
      signal: signal || AbortSignal.timeout(8000)
    })
    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 || response.status === 429
        ? response.status : 502
      throw new ModelListError(`模型清單載入失敗（HTTP ${response.status}），請確認金鑰、權限與端點。`, status)
    }
    const body = await response.json()
    const entries = gemini ? body.models : body.data
    if (!Array.isArray(entries)) throw new ModelListError('此端點未回傳標準模型清單，請手動輸入模型名稱。')
    for (const entry of entries) {
      if (!entry || entry.active === false) continue
      if (gemini && !entry.supportedGenerationMethods?.includes('generateContent')) continue
      const id = gemini ? entry.name?.replace(/^models\//, '') : entry.id
      if (typeof id !== 'string' || !id.trim() || id.length > 256) continue
      models.set(id, { id, name: typeof entry.displayName === 'string' ? entry.displayName : id })
    }
    pageToken = gemini && typeof body.nextPageToken === 'string' ? body.nextPageToken : ''
    if (pageToken) {
      if (seenTokens.has(pageToken) || seenTokens.size >= 20) throw new ModelListError('模型清單分頁異常，請重試。')
      seenTokens.add(pageToken)
    }
  } while (pageToken)
  if (!models.size) throw new ModelListError('此金鑰目前未回傳可用模型，請確認權限或手動輸入。')
  return Array.from(models.values()).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
}
