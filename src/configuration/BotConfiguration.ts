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
  private readonly CONFIG_VERSION = 1;
  private readonly CONFIG_PATH = "./bot.yml";

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
    return key
      .split(".")
      .reduce((obj: any, part: string) => obj?.[part], this.config) as T;
  }

  public set<T>(key: string, value: T): void {
    const parts = key.split(".");
    const lastKey = parts.pop()!;
    const target = parts.reduce((obj: any, part: string) => {
      obj[part] ??= {};
      return obj[part];
    }, this.config);

    target[lastKey] = value;
    this.save();
  }

  public has(key: string): boolean {
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
      this.save();
    }
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
