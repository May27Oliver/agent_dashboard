import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitMetric {
  limit: number | null;
  remaining: number | null;
  reset: string | null;
}

export interface RateLimitInfo {
  requests: RateLimitMetric;
  inputTokens: RateLimitMetric;
  outputTokens: RateLimitMetric;
  lastUpdated: number;
  source: 'api' | 'cache' | 'unavailable';
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private cache: RateLimitInfo | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分鐘
  private readonly API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

  async getRateLimits(): Promise<RateLimitInfo | null> {
    // 檢查緩存
    if (this.cache && Date.now() - this.cache.lastUpdated < this.CACHE_TTL) {
      return { ...this.cache, source: 'cache' };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set, rate limits unavailable');
      return this.getUnavailableInfo();
    }

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: '.' }],
        }),
      });

      const rateLimits: RateLimitInfo = {
        requests: {
          limit: this.parseHeader(
            response.headers.get('anthropic-ratelimit-requests-limit'),
          ),
          remaining: this.parseHeader(
            response.headers.get('anthropic-ratelimit-requests-remaining'),
          ),
          reset: response.headers.get('anthropic-ratelimit-requests-reset'),
        },
        inputTokens: {
          limit: this.parseHeader(
            response.headers.get('anthropic-ratelimit-input-tokens-limit'),
          ),
          remaining: this.parseHeader(
            response.headers.get('anthropic-ratelimit-input-tokens-remaining'),
          ),
          reset: response.headers.get('anthropic-ratelimit-input-tokens-reset'),
        },
        outputTokens: {
          limit: this.parseHeader(
            response.headers.get('anthropic-ratelimit-output-tokens-limit'),
          ),
          remaining: this.parseHeader(
            response.headers.get('anthropic-ratelimit-output-tokens-remaining'),
          ),
          reset: response.headers.get('anthropic-ratelimit-output-tokens-reset'),
        },
        lastUpdated: Date.now(),
        source: 'api',
      };

      this.cache = rateLimits;
      return rateLimits;
    } catch (error) {
      this.logger.error('Failed to fetch rate limits', error);
      return this.cache
        ? { ...this.cache, source: 'cache' }
        : this.getUnavailableInfo();
    }
  }

  private parseHeader(value: string | null): number | null {
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  private getUnavailableInfo(): RateLimitInfo {
    return {
      requests: { limit: null, remaining: null, reset: null },
      inputTokens: { limit: null, remaining: null, reset: null },
      outputTokens: { limit: null, remaining: null, reset: null },
      lastUpdated: Date.now(),
      source: 'unavailable',
    };
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
