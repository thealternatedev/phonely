import { createInterface } from "readline";
import { PhonelyClient } from "../Phonely";
import clc from "cli-color";

export class CustomInterface {
  private readonly rl;
  private readonly client: PhonelyClient;
  private readonly commands = new Map<
    string,
    (args?: string[]) => Promise<void>
  >();

  constructor(client: PhonelyClient) {
    this.client = client;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: clc.cyan("Phonely > "),
    });

    // Register built-in commands
    this.commands.set("reload", async () => {
      console.log(
        `${clc.yellow("⚡")} ${clc.cyan("Reloading")} ${clc.magenta("commands")}...`,
      );
      await this.client.commandManager.reloadCommands();
    });

    this.commands.set("clear", async () => {
      console.log(
        `${clc.yellow("🗑️")} ${clc.cyan("Executing")} ${clc.magenta("clear")}...`,
      );
      console.clear();
    });

    this.commands.set("exit", async () => {
      console.log(
        `${clc.yellow("👋")} ${clc.cyan("Executing")} ${clc.magenta("exit")}...`,
      );
      this.client.destroy();
      process.exit(0);
    });

    this.commands.set("help", async () => {
      console.log(clc.yellow("\n📚 Available Commands:"));
      console.log(clc.blackBright("━".repeat(30)));
      for (const cmd of this.commands.keys()) {
        console.log(`${clc.cyan("❯")} ${clc.magenta(cmd)}`);
      }
      console.log();
    });

    this.commands.set("stats", async () => {
      console.log(clc.yellow("\n📊 Bot Statistics:"));
      console.log(clc.blackBright("━".repeat(30)));
      console.log(
        `${clc.cyan("❯")} Servers: ${clc.magenta(this.client.guilds.cache.size)}`,
      );
      console.log(
        `${clc.cyan("❯")} Users: ${clc.magenta(this.client.users.cache.size)}`,
      );
      console.log(
        `${clc.cyan("❯")} Uptime: ${clc.magenta(Math.floor(this.client.uptime! / 1000))}s`,
      );
      console.log();
    });

    this.commands.set("reloadconfig", async () => {
      console.log(
        `${clc.yellow("⚡")} ${clc.cyan("Reloading")} ${clc.magenta("configuration")}...`,
      );
      this.client.config.reload();
      console.log(`${clc.green("✓")} Configuration reloaded successfully!`);
    });

    this.commands.set("guilds", async () => {
      console.log(clc.yellow("\n🌐 Connected Guilds:"));
      console.log(clc.blackBright("━".repeat(30)));

      // First display the special guild
      const specialGuild = this.client.guilds.cache.get("1306277925745721487");
      if (specialGuild) {
        console.log(clc.yellow("\n📌 Special Guild:"));
        console.log(
          `${clc.cyan("❯")} ${clc.magenta(specialGuild.name)} ${clc.blackBright(`(${specialGuild.id})`)} - ${clc.yellow(specialGuild.memberCount)} members`,
        );
      }

      // Then display other guilds
      console.log(clc.yellow("\n🌍 Other Guilds:"));
      this.client.guilds.cache.forEach((guild) => {
        if (guild.id !== "1306277925745721487") {
          console.log(
            `${clc.cyan("❯")} ${clc.magenta(guild.name)} ${clc.blackBright(`(${guild.id})`)} - ${clc.yellow(guild.memberCount)} members`,
          );
        }
      });
      console.log();
    });

    // Start listening
    this.start();
  }

  private start() {
    this.rl.prompt();

    this.rl.on("line", async (line) => {
      const [command, ...args] = line.trim().split(" ");

      if (this.commands.has(command)) {
        try {
          await this.commands.get(command)!(args);
        } catch (error) {
          console.error(`${clc.red("✗")} Error executing command:`, error);
        }
      } else if (command) {
        console.log(`${clc.red("✗")} Unknown command: ${clc.magenta(command)}`);
        console.log(
          `${clc.yellow("💡")} Type ${clc.magenta("help")} for available commands`,
        );
      }

      this.rl.prompt();
    });

    this.rl.on("close", () => {
      console.log(`\n${clc.yellow("👋")} ${clc.cyan("Goodbye!")}`);
      process.exit(0);
    });
  }
}
