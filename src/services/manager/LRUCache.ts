import { EventEmitter } from 'events';

interface CacheItem<V> {
  value: V;
  expiry?: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  capacity: number;
}

type EvictionPolicy = 'LRU' | 'LFU';

interface LRUCacheOptions<K, V> {
  capacity: number;
  defaultTTL?: number;
  cleanupIntervalMs?: number;
  evictionPolicy?: EvictionPolicy;
  resetTTLOnAccess?: boolean;
  onExpiry?: (key: K, value: V) => void;
}

/**
 * An enhanced LRU Cache implementation with TTL support and events.
 *
 * @class LRUCache<K, V>
 * @template K - The type of the keys in the cache.
 * @template V - The type of the values in the cache.
 */
class LRUCache<K, V> extends EventEmitter {
  private capacity: number;
  private cache: Map<K, CacheItem<V>>;
  private defaultTTL?: number;
  private cleanupInterval?: NodeJS.Timeout;
  private evictionPolicy: EvictionPolicy;
  private resetTTLOnAccess: boolean;
  private onExpiry?: (key: K, value: V) => void;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LRUCacheOptions<K, V>) {
    super();
    this.capacity = options.capacity;
    this.cache = new Map<K, CacheItem<V>>();
    this.defaultTTL = options.defaultTTL;
    this.evictionPolicy = options.evictionPolicy || 'LRU';
    this.resetTTLOnAccess = options.resetTTLOnAccess || false;
    this.onExpiry = options.onExpiry;

    if (options.cleanupIntervalMs) {
      this.cleanupInterval = setInterval(
        () => this.cleanupExpiredItems(),
        options.cleanupIntervalMs
      );
    }
  }

  /**
   * Retrieves a value from the cache by its key.
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      this.misses++;
      return undefined;
    }

    const item = this.cache.get(key)!;

    if (item.expiry && item.expiry < Date.now()) {
      this.delete(key);
      this.onExpiry?.(key, item.value);
      return undefined;
    }

    this.hits++;
    item.hits++;

    if (this.resetTTLOnAccess && item.expiry) {
      item.expiry = Date.now() + (this.defaultTTL ?? 0);
    }

    if (this.evictionPolicy === 'LRU') {
      this.cache.delete(key);
      this.cache.set(key, item);
    }

    this.emit('hit', key);
    return item.value;
  }

  /**
   * Sets a value in the cache with optional TTL.
   */
  set(key: K, value: V, ttl?: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const keyToEvict = this.selectKeyForEviction();
      if (keyToEvict) {
        const evictedItem = this.cache.get(keyToEvict);
        this.delete(keyToEvict);
        this.evictions++;
        this.emit('evict', keyToEvict, evictedItem?.value);
      }
    }

    const item: CacheItem<V> = {
      value,
      hits: 0,
      expiry:
        ttl || this.defaultTTL
          ? Date.now() + (ttl || this.defaultTTL!)
          : undefined,
    };

    this.cache.set(key, item);
    this.emit('set', key);
  }

  private selectKeyForEviction(): K | undefined {
    if (this.evictionPolicy === 'LFU') {
      let minHits = Infinity;
      let keyToEvict: K | undefined;

      for (const [key, item] of this.cache) {
        if (item.hits < minHits) {
          minHits = item.hits;
          keyToEvict = key;
        }
      }

      return keyToEvict;
    }

    return this.cache.keys().next().value;
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (item.expiry && item.expiry < now) {
        this.delete(key);
        this.onExpiry?.(key, item.value);
      }
    }
  }

  /**
   * Removes a specific key from the cache.
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) this.emit('delete', key);
    return deleted;
  }

  /**
   * Checks if a key exists in the cache.
   */
  has(key: K): boolean {
    if (!this.cache.has(key)) return false;

    const item = this.cache.get(key)!;
    if (item.expiry && item.expiry < Date.now()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Returns the current size of the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Returns all valid keys in the cache.
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Returns all valid values in the cache.
   */
  values(): V[] {
    return Array.from(this.cache.values()).map((item) => item.value);
  }

  /**
   * Clears all items from the cache.
   */
  clear(): void {
    this.cache.clear();
    this.emit('clear');
  }

  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      capacity: this.capacity,
    };
  }

  /**
   * Closes the cache and clears all items.
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }

  /**
   * Updates the cache capacity and evicts items if necessary.
   *
   * @param {number} newCapacity - The new capacity of the cache.
   */
  updateCapacity(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('Capacity must be greater than zero');
    }

    this.capacity = newCapacity;

    while (this.cache.size > this.capacity) {
      const keyToEvict = this.selectKeyForEviction();
      if (keyToEvict) {
        const evictedItem = this.cache.get(keyToEvict);
        this.delete(keyToEvict);
        this.evictions++;
        this.emit('evict', keyToEvict, evictedItem?.value);
      }
    }
  }
}

export default LRUCache;
