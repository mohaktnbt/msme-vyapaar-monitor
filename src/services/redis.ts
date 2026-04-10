// ============================================================
// Upstash Redis Client Wrapper
// Key prefix: vyapaar:{category}:{id}
// Graceful fallback when UPSTASH_REDIS_REST_URL is not configured
// ============================================================

interface RedisConfig {
  url: string
  token: string
}

interface RedisClient {
  get: <T = string>(key: string) => Promise<T | null>
  set: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>
  del: (key: string) => Promise<void>
  exists: (key: string) => Promise<boolean>
}

const KEY_PREFIX = 'vyapaar'

function buildKey(category: string, id: string): string {
  return `${KEY_PREFIX}:${category}:${id}`
}

function getConfig(): RedisConfig | null {
  const url =
    typeof process !== 'undefined'
      ? (process.env?.UPSTASH_REDIS_REST_URL ?? '')
      : ''
  const token =
    typeof process !== 'undefined'
      ? (process.env?.UPSTASH_REDIS_REST_TOKEN ?? '')
      : ''

  if (!url || !token) return null
  return { url, token }
}

async function redisRequest<T>(
  config: RedisConfig,
  command: string[]
): Promise<T> {
  const res = await fetch(`${config.url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!res.ok) {
    throw new Error(`Redis error: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as { result: T }
  return json.result
}

function createNoopClient(): RedisClient {
  return {
    get: async () => null,
    set: async () => {},
    del: async () => {},
    exists: async () => false,
  }
}

function createRedisClient(config: RedisConfig): RedisClient {
  return {
    async get<T = string>(key: string): Promise<T | null> {
      try {
        const result = await redisRequest<string | null>(config, ['GET', key])
        if (result === null) return null
        try {
          return JSON.parse(result) as T
        } catch {
          return result as unknown as T
        }
      } catch (err) {
        console.warn('[Redis] GET failed:', err)
        return null
      }
    },

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
      try {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value)
        const command = ttlSeconds
          ? ['SET', key, serialized, 'EX', String(ttlSeconds)]
          : ['SET', key, serialized]
        await redisRequest<string>(config, command)
      } catch (err) {
        console.warn('[Redis] SET failed:', err)
      }
    },

    async del(key: string): Promise<void> {
      try {
        await redisRequest<number>(config, ['DEL', key])
      } catch (err) {
        console.warn('[Redis] DEL failed:', err)
      }
    },

    async exists(key: string): Promise<boolean> {
      try {
        const result = await redisRequest<number>(config, ['EXISTS', key])
        return result === 1
      } catch (err) {
        console.warn('[Redis] EXISTS failed:', err)
        return false
      }
    },
  }
}

/** Singleton Redis client instance */
let _client: RedisClient | null = null

export function getRedisClient(): RedisClient {
  if (_client) return _client
  const config = getConfig()
  _client = config ? createRedisClient(config) : createNoopClient()
  return _client
}

export { buildKey, KEY_PREFIX }
export type { RedisClient, RedisConfig }
