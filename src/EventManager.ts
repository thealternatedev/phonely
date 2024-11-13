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

  constructor() {
    // Use __dirname directly since we're in CommonJS
    this.eventsPath = join(__dirname, "events");
  }

  async loadEvents(): Promise<void> {
    try {
      // Get all TypeScript and JavaScript files
      const eventFiles = readdirSync(this.eventsPath).filter((file) =>
        /\.[jt]s$/.test(file),
      );

      console.log(clc.blue(`📁 Found ${eventFiles.length} event files`));

      // Load events in parallel for better performance
      const results = await Promise.allSettled(
        eventFiles.map((file) => this.loadEvent(file)),
      );

      const loadedCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const skippedCount = results.filter(
        (r) => r.status === "rejected",
      ).length;

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
    const event = require(join(this.eventsPath, file)).default;

    if (!this.isValidEvent(event)) {
      console.warn(clc.yellow(`⚠️ Skipped invalid event in file: ${file}`));
      throw new Error("Invalid event");
    }

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
    // Bind events in a single iteration
    for (const [_, event] of this.events) {
      const handler = (...args: any[]) =>
        event.execute(client, ...(args as ClientEvents[keyof ClientEvents]));
      (event.once ? client.once : client.on).call(client, event.name, handler);
    }
  }
}
