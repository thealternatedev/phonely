import { MySQLDriver, QuickDB } from "quick.db";
import { PhonelyClient } from "../Phonely";
import path from "path";
import { existsSync, mkdirSync } from "fs";

export class DatabaseManager {
  private db: QuickDB;
  private client: PhonelyClient;
  // Cache for frequently accessed values with size limit
  private cache: Map<string, any>;
  // Cache TTL in ms (5 minutes)
  private static readonly CACHE_TTL = 300000;
  private static readonly MAX_CACHE_SIZE = 10000;
  private cacheTimestamps: Map<string, number>;
  // Batch operation queue
  private batchQueue: Map<string, any>;
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(client: PhonelyClient) {
    this.client = client;
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.batchQueue = new Map();

    // Load config once
    const config = this.client.config;
    config.reload();

    // Check if databases directory exists, create if not
    const databasesDir = path.join(process.cwd(), "databases");
    if (!existsSync(databasesDir)) {
      mkdirSync(databasesDir);
    }

    if (config.get("database.type") === "sqlite") {
      this.db = new QuickDB({
        filePath: path.join(
          databasesDir,
          `${config.get("database.name")}.phonelydb`,
        ),
      });
    } else if (config.get("database.type") === "mysql") {
      const driver = new MySQLDriver({
        host: config.get("database.host"),
        user: config.get("database.user"),
        password: config.get("database.password"),
        database: config.get("database.name"),
        // Optimized connection pooling
        connectionLimit: 20,
        // Enable query caching
        enableKeepAlive: true,
        // Connection timeout
        connectTimeout: 10000,
      });
      this.db = new QuickDB({ driver });
    }

    // Initialize database version if not found
    this.initializeDatabase();

    // Periodic cache cleanup
    setInterval(() => this.cleanCache(), 30000);
  }

  private cleanCache(): void {
    const now = Date.now();
    let deletedCount = 0;

    // LRU cache eviction
    if (this.cache.size > DatabaseManager.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cacheTimestamps.entries()).sort(
        ([, a], [, b]) => a - b,
      );

      const entriesToDelete = sortedEntries.slice(
        0,
        Math.floor(DatabaseManager.MAX_CACHE_SIZE * 0.2),
      );
      for (const [key] of entriesToDelete) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
        deletedCount++;
      }
    }

    // TTL-based cleanup
    for (const [key, timestamp] of this.cacheTimestamps) {
      if (now - timestamp > DatabaseManager.CACHE_TTL) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
        deletedCount++;
      }
    }
  }

  private async initializeDatabase(): Promise<void> {
    const version = await this.get<number>("PHONELY_DATABASE_VERSION");
    if (!version) {
      await this.set("PHONELY_DATABASE_VERSION", 1);
    }
  }

  /**
   * Get a value from the database with caching and prefetching
   */
  public async get<T>(
    key: string,
    prefetchPattern?: string,
  ): Promise<T | null> {
    // Check cache first
    if (this.cache.has(key)) {
      const timestamp = this.cacheTimestamps.get(key);
      if (timestamp && Date.now() - timestamp < DatabaseManager.CACHE_TTL) {
        return this.cache.get(key) as T;
      }
    }

    const value = (await this.db.get(key)) as T;

    // Prefetch related keys
    if (prefetchPattern) {
      this.prefetchKeys(prefetchPattern);
    }

    // Update cache
    if (value !== null) {
      this.updateCache(key, value);
    }

    return value;
  }

  /**
   * Set a value with batching support
   */
  public async set<T>(
    key: string,
    value: T,
    batch: boolean = false,
  ): Promise<void> {
    if (batch) {
      this.batchQueue.set(key, value);
      this.scheduleBatchUpdate();
    } else {
      await this.db.set(key, value);
      this.updateCache(key, value);
    }
  }

  private scheduleBatchUpdate(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(async () => {
      await this.executeBatch();
      this.batchTimeout = null;
    }, 100);
  }

  private async executeBatch(): Promise<void> {
    if (this.batchQueue.size === 0) return;

    const entries = Array.from(this.batchQueue.entries());
    this.batchQueue.clear();

    await Promise.all(entries.map(([key, value]) => this.db.set(key, value)));

    // Update cache for all batch entries
    for (const [key, value] of entries) {
      this.updateCache(key, value);
    }
  }

  private updateCache(key: string, value: any): void {
    if (this.cache.size >= DatabaseManager.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cacheTimestamps.entries()).sort(
        ([, a], [, b]) => a - b,
      )[0][0];
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }

    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  private async prefetchKeys(pattern: string): Promise<void> {
    const keys = await this.db.all();
    const matchingKeys = keys.filter((entry) => entry.id.startsWith(pattern));

    for (const { id, value } of matchingKeys) {
      this.updateCache(id, value);
    }
  }

  /**
   * Bulk operations for better performance
   */
  public async bulkSet(entries: [string, any][]): Promise<void> {
    await Promise.all(entries.map(([key, value]) => this.db.set(key, value)));

    for (const [key, value] of entries) {
      this.updateCache(key, value);
    }
  }

  public async bulkGet(keys: string[]): Promise<Map<string, any>> {
    const results = new Map();
    const uncachedKeys: string[] = [];

    // Check cache first
    for (const key of keys) {
      if (this.cache.has(key)) {
        const timestamp = this.cacheTimestamps.get(key);
        if (timestamp && Date.now() - timestamp < DatabaseManager.CACHE_TTL) {
          results.set(key, this.cache.get(key));
          continue;
        }
      }
      uncachedKeys.push(key);
    }

    // Fetch uncached keys
    if (uncachedKeys.length > 0) {
      const values = await Promise.all(
        uncachedKeys.map((key) => this.db.get(key)),
      );

      uncachedKeys.forEach((key, index) => {
        const value = values[index];
        if (value !== null) {
          results.set(key, value);
          this.updateCache(key, value);
        }
      });
    }

    return results;
  }

  public async delete(key: string): Promise<void> {
    await this.db.delete(key);
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
  }

  public async has(key: string): Promise<boolean> {
    if (this.cache.has(key)) {
      const timestamp = this.cacheTimestamps.get(key);
      if (timestamp && Date.now() - timestamp < DatabaseManager.CACHE_TTL) {
        return true;
      }
    }
    return await this.db.has(key);
  }

  public async clear(): Promise<void> {
    await this.db.deleteAll();
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.batchQueue.clear();
  }

  public async keys(): Promise<string[]> {
    const data = await this.db.all();
    return data.map((entry) => entry.id);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: this.cache.size / DatabaseManager.MAX_CACHE_SIZE,
    };
  }
}
