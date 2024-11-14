import { readFileSync, writeFileSync } from "fs";
import { parse, stringify } from "yaml";

export interface BotConfig {
  database?: {
    type: "sqlite" | "mysql";
    name: string;
    host?: string;
    user?: string;
    password?: string;
  };
  moderation?: {
    banRoleId: string;
  };
}

export class BotConfiguration {
  private static instance: BotConfiguration;
  private config: BotConfig;
  private configCache: Map<string, any> = new Map();
  private readonly CONFIG_VERSION = 1;
  private readonly CONFIG_PATH = "./bot.yml";
  private saveDebounceTimeout?: NodeJS.Timeout;

  constructor() {
    this.loadConfig();
  }

  public static getInstance(): BotConfiguration {
    return (BotConfiguration.instance ??= new BotConfiguration());
  }

  private loadConfig(): void {
    try {
      const fileContents = readFileSync(this.CONFIG_PATH, "utf8");
      this.config = parse(fileContents);
      this.configCache.clear(); // Clear cache on reload

      const version = this.get<number>("config_version");
      if (!version) {
        this.set("config_version", this.CONFIG_VERSION);
      } else if (version !== this.CONFIG_VERSION) {
        console.warn(
          `Config version mismatch. Expected ${this.CONFIG_VERSION}, got ${version}`,
        );
      }
    } catch (error) {
      console.error("Failed to load bot configuration:", error);
      process.exit(1);
    }
  }

  public get<T>(key: string): T | undefined {
    // Check cache first
    const cached = this.configCache.get(key);
    if (cached !== undefined) {
      return cached as T;
    }

    // If not in cache, compute and store
    const value = key
      .split(".")
      .reduce((obj: any, part: string) => obj?.[part], this.config) as T;

    this.configCache.set(key, value);
    return value;
  }

  public set<T>(key: string, value: T): void {
    const parts = key.split(".");
    const lastKey = parts.pop()!;
    const target = parts.reduce((obj: any, part: string) => {
      obj[part] ??= {};
      return obj[part];
    }, this.config);

    target[lastKey] = value;
    this.configCache.set(key, value); // Update cache
    this.debouncedSave();
  }

  public has(key: string): boolean {
    // Use cache if available
    if (this.configCache.has(key)) {
      return this.configCache.get(key) !== undefined;
    }
    return this.get(key) !== undefined;
  }

  public remove(key: string): void {
    const parts = key.split(".");
    const lastKey = parts.pop()!;
    const target = parts.reduce(
      (obj: any, part: string) => obj?.[part],
      this.config,
    );

    if (target) {
      delete target[lastKey];
      this.configCache.delete(key); // Clear from cache
      this.debouncedSave();
    }
  }

  private debouncedSave(): void {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
    }
    this.saveDebounceTimeout = setTimeout(() => this.save(), 100);
  }

  private save(): void {
    try {
      writeFileSync(this.CONFIG_PATH, stringify(this.config), "utf8");
    } catch (error) {
      console.error("Failed to save bot configuration:", error);
    }
  }

  public reload(): void {
    this.loadConfig();
  }
}
