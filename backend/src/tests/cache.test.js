import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LRUCache, createCacheKey } from '../services/ai/cache.js';

describe('AI Cache Module', () => {
  it('stores and retrieves cached items', () => {
    const cache = new LRUCache(10, 10_000);
    cache.set('k1', { score: 5 });
    assert.deepStrictEqual(cache.get('k1'), { score: 5 });
  });

  it('evicts least recently used item when max size is reached', () => {
    const cache = new LRUCache(2, 10_000);
    cache.set('a', 1);
    cache.set('b', 2);
    // Access 'a' so 'b' becomes the LRU
    cache.get('a');
    // Insert 'c', which should evict 'b'
    cache.set('c', 3);

    assert.strictEqual(cache.get('a'), 1);
    assert.strictEqual(cache.get('b'), undefined); // evicted
    assert.strictEqual(cache.get('c'), 3);
  });

  it('expires items after TTL', async () => {
    const cache = new LRUCache(10, 20); // 20ms TTL
    cache.set('temp', 'val');
    assert.strictEqual(cache.get('temp'), 'val');

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.strictEqual(cache.get('temp'), undefined);
  });

  it('creates deterministic SHA-256 keys from payload objects', () => {
    const p1 = { a: 1, b: 'test' };
    const p2 = { a: 1, b: 'test' };
    const p3 = { a: 2, b: 'test' };

    const k1 = createCacheKey(p1);
    const k2 = createCacheKey(p2);
    const k3 = createCacheKey(p3);

    assert.strictEqual(k1, k2);
    assert.notStrictEqual(k1, k3);
    assert.strictEqual(k1.length, 64);
  });
});
