import Redis from 'ioredis';

export class SessionService {
  private redis: Redis;

  constructor(redisClient?: Redis) {
    this.redis = redisClient ?? new Redis(process.env.REDIS_URL);
  }

  async createSession(
    jti: string,
    payload: any,
    ttlSeconds = 7 * 24 * 60 * 60,
  ) {
    await this.redis.set(
      `session:${jti}`,
      JSON.stringify(payload),
      'EX',
      ttlSeconds,
    );
  }

  async getSession(jti: string) {
    const raw = await this.redis.get(`session:${jti}`);
    return raw ? JSON.parse(raw) : null;
  }

  async deleteSession(jti: string) {
    await this.redis.del(`session:${jti}`);
  }
}

export default SessionService;
