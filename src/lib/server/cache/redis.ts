/**
 * Redis (Vercel KV) Cache Adapter
 * Provides L2 cache via Vercel KV when available, falls back to DB cache.
 * 
 * Environment variables required:
 * - KV_REST_API_URL
 * - KV_REST_API_TOKEN
 */

import { env } from '$env/dynamic/private';

interface RedisResponse {
  result: unknown;
}

function isRedisAvailable(): boolean {
  return !!(env.KV_REST_API_URL && env.KV_REST_API_TOKEN);
}

async function redisRequest(command: string[]): Promise<unknown> {
  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Redis not configured');

  const res = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });

  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const data: RedisResponse = await res.json();
  return data.result;
}

export const redisCache = {
  isAvailable: isRedisAvailable,

  async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) return null;
    try {
      const result = await redisRequest(['GET', key]);
      if (result === null || result === undefined) return null;
      return typeof result === 'string' ? JSON.parse(result) : (result as T);
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!isRedisAvailable()) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redisRequest(['SET', key, serialized, 'EX', String(ttlSeconds)]);
      } else {
        await redisRequest(['SET', key, serialized]);
      }
    } catch {
      // Silently fail
    }
  },

  async delete(key: string): Promise<boolean> {
    if (!isRedisAvailable()) return false;
    try {
      const result = await redisRequest(['DEL', key]);
      return result === 1;
    } catch {
      return false;
    }
  },

  async deleteByPattern(pattern: string): Promise<number> {
    if (!isRedisAvailable()) return 0;
    try {
      // SCAN + DEL pattern (Vercel KV supports this via KEYS)
      const keys = (await redisRequest(['KEYS', pattern])) as string[];
      if (!keys || keys.length === 0) return 0;
      for (const key of keys) {
        await redisRequest(['DEL', key]);
      }
      return keys.length;
    } catch {
      return 0;
    }
  }
};
