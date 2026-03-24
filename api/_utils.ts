// ============================================================
// MSME Vyapaar Monitor — Shared API Utilities
// ============================================================

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
  'Access-Control-Max-Age': '86400',
}

export function withCors(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  })
}

export function errorResponse(msg: string, status = 400): Response {
  return withCors(JSON.stringify({ error: msg, status }), status)
}

// ---------------------------------------------------------------------------
// Upstash Redis client (REST-based, works in Edge runtime)
// ---------------------------------------------------------------------------

export interface RedisClient {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, options?: { ex?: number }) => Promise<string | null>
  sadd: (key: string, ...members: string[]) => Promise<number>
  smembers: (key: string) => Promise<string[]>
}

export function getRedisClient(): RedisClient | null {
  const url = getEnv('UPSTASH_REDIS_REST_URL')
  const token = getEnv('UPSTASH_REDIS_REST_TOKEN')

  if (!url || !token) return null

  const redisRequest = async (command: string[]): Promise<unknown> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    })
    if (!res.ok) throw new Error(`Redis error: ${res.status}`)
    const data = (await res.json()) as { result: unknown }
    return data.result
  }

  return {
    async get(key: string): Promise<string | null> {
      const result = await redisRequest(['GET', key])
      return result as string | null
    },
    async set(key: string, value: string, options?: { ex?: number }): Promise<string | null> {
      const cmd: string[] = ['SET', key, value]
      if (options?.ex) {
        cmd.push('EX', String(options.ex))
      }
      const result = await redisRequest(cmd)
      return result as string | null
    },
    async sadd(key: string, ...members: string[]): Promise<number> {
      const result = await redisRequest(['SADD', key, ...members])
      return result as number
    },
    async smembers(key: string): Promise<string[]> {
      const result = await redisRequest(['SMEMBERS', key])
      return (result as string[]) || []
    },
  }
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

export async function cacheGet(
  redis: RedisClient | null,
  key: string,
): Promise<unknown | null> {
  if (!redis) return null
  try {
    const val = await redis.get(key)
    if (!val) return null
    return JSON.parse(val)
  } catch {
    return null
  }
}

export async function cacheSet(
  redis: RedisClient | null,
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
  } catch {
    // ignore cache write failures
  }
}

// ---------------------------------------------------------------------------
// RSS / Atom XML parser (pure string, no DOM)
// ---------------------------------------------------------------------------

export interface FeedItem {
  title: string
  link: string
  description: string
  pubDate: string
  guid: string
}

function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i')
  const cdataMatch = cdataRe.exec(xml)
  if (cdataMatch) return cdataMatch[1].trim()

  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const match = re.exec(xml)
  if (match) return match[1].trim()

  // Self-closing / attribute-based (Atom link href)
  if (tag === 'link') {
    const hrefRe = /<link[^>]+href=["']([^"']+)["']/i
    const hrefMatch = hrefRe.exec(xml)
    if (hrefMatch) return hrefMatch[1].trim()
  }
  return ''
}

export function parseRSS(xmlText: string): FeedItem[] {
  const items: FeedItem[] = []

  // Support both RSS <item> and Atom <entry>
  const itemRe = /(<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>)/gi
  let match: RegExpExecArray | null

  while ((match = itemRe.exec(xmlText)) !== null) {
    const block = match[1]

    const title = extractTag(block, 'title') || 'Untitled'
    const link =
      extractTag(block, 'link') ||
      extractTag(block, 'id') ||
      ''
    const description =
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content') ||
      ''
    const pubDate =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated') ||
      new Date().toISOString()
    const guid = extractTag(block, 'guid') || extractTag(block, 'id') || link || title

    items.push({
      title: title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"'),
      link,
      description: description
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim(),
      pubDate,
      guid,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// In-memory circuit breaker
// ---------------------------------------------------------------------------

interface CircuitEntry {
  failures: number[]  // timestamps of failures
  open: boolean
  openedAt?: number
}

const circuitState: Map<string, CircuitEntry> = new Map()

const FAILURE_THRESHOLD = 3
const WINDOW_MS = 5 * 60 * 1000   // 5 minutes
const COOLDOWN_MS = 5 * 60 * 1000  // 5 minutes

/**
 * Returns true if the circuit is open (requests should be skipped).
 * Call recordSuccess / recordFailure to update state.
 */
export const circuitBreaker = {
  isOpen(key: string): boolean {
    const entry = circuitState.get(key)
    if (!entry) return false

    if (entry.open) {
      // Check if cooldown has passed
      if (entry.openedAt && Date.now() - entry.openedAt >= COOLDOWN_MS) {
        // Half-open: allow one attempt
        entry.open = false
        entry.failures = []
        return false
      }
      return true
    }
    return false
  },

  recordFailure(key: string): void {
    const now = Date.now()
    const entry = circuitState.get(key) || { failures: [], open: false }

    // Prune old failures outside the window
    entry.failures = entry.failures.filter(t => now - t < WINDOW_MS)
    entry.failures.push(now)

    if (entry.failures.length >= FAILURE_THRESHOLD) {
      entry.open = true
      entry.openedAt = now
    }

    circuitState.set(key, entry)
  },

  recordSuccess(key: string): void {
    circuitState.set(key, { failures: [], open: false })
  },
}

// ---------------------------------------------------------------------------
// Simple hash for cache keys (djb2, no crypto needed)
// ---------------------------------------------------------------------------

export function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0  // force unsigned 32-bit
  }
  return hash.toString(16)
}

// ---------------------------------------------------------------------------
// Environment helper
// ---------------------------------------------------------------------------

export function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return (globalThis as Record<string, unknown>)[key] as string | undefined
}
