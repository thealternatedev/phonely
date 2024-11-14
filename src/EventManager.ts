import { ClientEvents, Collection } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { PhonelyClient } from "./Phonely";
import clc from "cli-color";

// Type-safe event interface
export interface Event<T extends keyof ClientEvents> {
  name: T;
  once?: boolean;
  execute: (
    client: PhonelyClient,
    ...args: ClientEvents[T]
  ) => Promise<void> | void;
}

export class EventManager {
  private readonly events = new Collection<string, Event<keyof ClientEvents>>();
  private readonly eventsPath: string;
  private readonly eventFileCache = new Map<
    string,
    Event<keyof ClientEvents>
  >();

  constructor() {
    this.eventsPath = join(__dirname, "events");
  }

  async loadEvents(): Promise<void> {
    try {
      // Get all TypeScript and JavaScript files using a single read operation
      const eventFiles = readdirSync(this.eventsPath, { withFileTypes: true })
        .filter((dirent) => /\.[jt]s$/.test(dirent.name))
        .map((dirent) => dirent.name);

      console.log(clc.blue(`📁 Found ${eventFiles.length} event files`));

      // Load events in chunks to prevent memory spikes
      const CHUNK_SIZE = 5;
      let loadedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < eventFiles.length; i += CHUNK_SIZE) {
        const chunk = eventFiles.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map((file) => this.loadEvent(file)),
        );

        loadedCount += results.filter((r) => r.status === "fulfilled").length;
        skippedCount += results.filter((r) => r.status === "rejected").length;
      }

      console.log(
        clc.cyan(`📊 Event Loading Summary:
   ${clc.green("✓")} Successfully loaded: ${loadedCount}
   ${clc.red("✗")} Skipped/Failed: ${skippedCount}
   📚 Total events: ${this.events.size}`),
      );
    } catch (error) {
      console.error(clc.red("❌ Critical error loading events:"), error);
      throw error;
    }
  }

  private async loadEvent(file: string): Promise<void> {
    // Check cache first
    if (this.eventFileCache.has(file)) {
      const cachedEvent = this.eventFileCache.get(file)!;
      this.events.set(cachedEvent.name, cachedEvent);
      return;
    }

    const event = require(join(this.eventsPath, file)).default;

    if (!this.isValidEvent(event)) {
      console.warn(clc.yellow(`⚠️ Skipped invalid event in file: ${file}`));
      throw new Error("Invalid event");
    }

    // Cache the event for future reloads
    this.eventFileCache.set(file, event);
    this.events.set(event.name, event);
    console.log(clc.green(`✅ Loaded event: ${event.name}`));
  }

  getEvent<T extends keyof ClientEvents>(name: T): Event<T> | undefined {
    return this.events.get(name) as Event<T> | undefined;
  }

  private isValidEvent(event: any): event is Event<keyof ClientEvents> {
    return event?.name && typeof event.execute === "function";
  }

  putToClient(client: PhonelyClient): void {
    // Pre-allocate handlers map for better performance
    const handlers = new Map<string, (...args: any[]) => void>();

    // Create handlers once
    for (const [_, event] of this.events) {
      const handler = (...args: any[]) =>
        event.execute(client, ...(args as ClientEvents[keyof ClientEvents]));
      handlers.set(event.name, handler);
      (event.once ? client.once : client.on).call(client, event.name, handler);
    }
  }
}
