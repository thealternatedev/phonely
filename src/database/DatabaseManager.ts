import { MySQLDriver, QuickDB } from "quick.db";
import { PhonelyClient } from "../Phonely";
import path from "path";
import { existsSync, mkdirSync } from "fs";

export class DatabaseManager {
  private db: QuickDB;
  private client: PhonelyClient;

  constructor(client: PhonelyClient) {
    this.client = client;

    this.client.config.reload();
    // Check if databases directory exists, create if not
    const databasesDir = path.join(process.cwd(), "databases");
    if (!existsSync(databasesDir)) {
      mkdirSync(databasesDir);
    }

    if (this.client.config.get("database.type") === "sqlite") {
      this.db = new QuickDB({
        filePath: path.join(
          databasesDir,
          `${this.client.config.get("database.name")}.phonelydb`,
        ),
      });
    } else if (this.client.config.get("database.type") === "mysql") {
      const driver = new MySQLDriver({
        host: this.client.config.get("database.host"),
        user: this.client.config.get("database.user"),
        password: this.client.config.get("database.password"),
        database: this.client.config.get("database.name"),
      });
      this.db = new QuickDB({
        driver,
      });
    }

    // Initialize database version if not found
    this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    if (!(await this.db.has("PHONELY_DATABASE_VERSION"))) {
      await this.db.set("PHONELY_DATABASE_VERSION", 1);
    }
  }

  /**
   * Get a value from the database
   * @param key The key to get
   * @returns The value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    return (await this.db.get(key)) as T;
  }

  /**
   * Set a value in the database
   * @param key The key to set
   * @param value The value to set
   */
  public async set<T>(key: string, value: T): Promise<void> {
    await this.db.set(key, value);
  }

  /**
   * Delete a value from the database
   * @param key The key to delete
   */
  public async delete(key: string): Promise<void> {
    await this.db.delete(key);
  }

  /**
   * Check if a key exists in the database
   * @param key The key to check
   * @returns Whether the key exists
   */
  public async has(key: string): Promise<boolean> {
    return await this.db.has(key);
  }

  /**
   * Clear all data from the database
   */
  public async clear(): Promise<void> {
    await this.db.deleteAll();
  }

  /**
   * Get all keys in the database
   * @returns Array of keys
   */
  public async keys(): Promise<string[]> {
    return await this.db.all().then((data) => data.map((entry) => entry.id));
  }
}
