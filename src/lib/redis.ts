const REST_URL = process.env.UPSTASH_REDIS_REST_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

function configured(): boolean {
  return Boolean(REST_URL && REST_TOKEN)
}

async function command(args: (string | number)[]): Promise<unknown> {
  if (!REST_URL || !REST_TOKEN) {
    throw new Error('Upstash Redis is not configured')
  }

  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upstash Redis error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as { result?: unknown; error?: string }
  if (data.error) throw new Error(data.error)
  return data.result ?? null
}

export const redis = {
  isConfigured: configured,

  async get(key: string): Promise<string | null> {
    if (!configured()) return null
    const result = await command(['GET', key])
    return result === null ? null : String(result)
  },

  async set(key: string, value: string): Promise<void> {
    await command(['SET', key, value])
  },

  async hset(key: string, field: string, value: string): Promise<void> {
    await command(['HSET', key, field, value])
  },

  async hget(key: string, field: string): Promise<string | null> {
    if (!configured()) return null
    const result = await command(['HGET', key, field])
    return result === null ? null : String(result)
  },
}
