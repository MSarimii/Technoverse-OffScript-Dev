/**
 * cache.js — In-Memory LRU Cache with TTL and Deterministic Hashing
 * Prevents redundant AI API calls when re-requesting grading suggestions.
 */

import crypto from 'node:crypto';
import { AI_CONFIG_DEFAULTS } from './config.js';

export class LRUCache {
  /**
   * @param {number} [max]
   * @param {number} [ttlMs]
   */
  constructor(max = AI_CONFIG_DEFAULTS.CACHE_MAX, ttlMs = AI_CONFIG_DEFAULTS.CACHE_TTL_MS) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.map = new Map(); // key -> { value, expiresAt }
  }

  /**
   * Retrieve item from cache.
   * Updates recency on hit and evicts expired items.
   * @param {string} key
   * @returns {any|undefined}
   */
  get(key) {
    if (!this.map.has(key)) return undefined;

    const entry = this.map.get(key);
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    // Refresh position to maintain LRU order (delete & re-insert)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  /**
   * Store item in cache.
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      // Evict oldest entry (first item in Map iterator)
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }

    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /** Clear all entries (useful in testing) */
  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

/** Global shared singleton cache */
export const aiCache = new LRUCache();

/**
 * Generates a deterministic SHA-256 cache key from an object payload.
 *
 * @param {Object} payload
 * @returns {string} SHA-256 hex digest
 */
export function createCacheKey(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
