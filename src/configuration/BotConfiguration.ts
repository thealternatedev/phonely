import { readFileSync } from "fs";
import { parse } from "yaml";

export interface BotConfig {}

export class BotConfiguration {
  private static instance: BotConfiguration;
  private config: BotConfig;

  constructor() {
    try {
      const fileContents = readFileSync("./bot.yml", "utf8");
      this.config = parse(fileContents);
    } catch (error) {
      console.error("Failed to load bot configuration:", error);
      process.exit(1);
    }
  }

  public static getInstance(): BotConfiguration {
    if (!BotConfiguration.instance) {
      BotConfiguration.instance = new BotConfiguration();
    }
    return BotConfiguration.instance;
  }

  public get<T>(key: string): T {
    return this.config[key];
  }

  public reload(): void {
    try {
      const fileContents = readFileSync("./bot.yml", "utf8");
      this.config = parse(fileContents);
    } catch (error) {
      console.error("Failed to reload bot configuration:", error);
    }
  }
}
