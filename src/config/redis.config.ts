import Redis from 'ioredis';

export type RedisClient = Redis;

export function createRedisClient(): RedisClient {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = new Redis(url);
  return client;
}

// Export a singleton if desired by consumers
let singleton: RedisClient | null = null;
export function getRedisClient(): RedisClient {
  if (!singleton) singleton = createRedisClient();
  return singleton;
}
