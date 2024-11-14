import { createInterface } from "readline";
import { PhonelyClient } from "../Phonely";
import clc from "cli-color";
import { ChannelType } from "discord.js";
import { createStatusEmbed } from "./StatusEmbed";

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
      prompt: clc.cyan("📞 ") + clc.magenta("Phonely") + clc.cyan(" ➜ "),
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
      console.log("\n");
      console.log(
        clc.yellow(
          "✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦",
        ),
      );
      console.log(
        clc.cyan(
          "                      📞 PHONELY BOT                        ",
        ),
      );
      console.log(
        clc.yellow(
          "✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦",
        ),
      );
      console.log("");
      console.log(
        clc.blue("  🤖 Bot User      : ") + clc.white(client.user?.tag),
      );
      console.log(
        clc.blue("  🌐 Servers       : ") + clc.white(client.guilds.cache.size),
      );
      console.log(clc.blue("  ⚡ Status        : ") + clc.green("Online"));
      console.log(
        clc.blue("  ⏰ Started At    : ") +
          clc.white(new Date().toLocaleString()),
      );
      console.log(clc.blue("  📦 Version       : ") + clc.white("v1.0.0"));
      console.log(
        clc.blue("  🔧 Node.js       : ") + clc.white(process.version),
      );
      console.log(
        clc.blue("  💾 Memory Usage  : ") +
          clc.white(
            `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          ),
      );
      console.log("");
      console.log(clc.magenta("  ✨ Features:"));
      console.log(clc.cyan("     🎲 Random Channel Roulette"));
      console.log(clc.cyan("     🎯 Direct Channel Connections"));
      console.log(clc.cyan("     ⏱️ Timed Speed Calls"));
      console.log(clc.cyan("     👥 Multi-Channel Conferences"));
      console.log(clc.cyan("     📊 Live Status Updates"));
      console.log("");
      console.log(
        clc.yellow(
          "* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *",
        ),
      );
      console.log(
        clc.green(
          "              ✨ Ready to make connections! ✨              ",
        ),
      );
      console.log(
        clc.yellow(
          "* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *",
        ),
      );
      console.log("\n");
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
        console.log(`${clc.cyan("➜")} ${clc.magenta(cmd)}`);
      }
      console.log();
    });

    this.commands.set("stats", async () => {
      console.log(clc.yellow("\n📊 Bot Statistics:"));
      console.log(clc.blackBright("━".repeat(30)));
      console.log(
        `${clc.cyan("➜")} Servers: ${clc.magenta(this.client.guilds.cache.size)}`,
      );
      console.log(
        `${clc.cyan("➜")} Users: ${clc.magenta(this.client.users.cache.size)}`,
      );
      console.log(
        `${clc.cyan("➜")} Uptime: ${clc.magenta(Math.floor(this.client.uptime! / 1000))}s`,
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
          `${clc.cyan("➜")} ${clc.magenta(specialGuild.name)} ${clc.blackBright(`(${specialGuild.id})`)} - ${clc.yellow(specialGuild.memberCount)} members`,
        );
      }

      // Then display other guilds
      console.log(clc.yellow("\n🌍 Other Guilds:"));
      this.client.guilds.cache.forEach((guild) => {
        if (guild.id !== "1306277925745721487") {
          console.log(
            `${clc.cyan("➜")} ${clc.magenta(guild.name)} ${clc.blackBright(`(${guild.id})`)} - ${clc.yellow(guild.memberCount)} members`,
          );
        }
      });
      console.log();
    });

    this.commands.set("statusembed", async (args) => {
      if (!args || args.length === 0) {
        console.log(`${clc.red("✗")} Please provide a channel ID`);
        return;
      }

      const channelId = args[0];
      const channel = this.client.channels.cache.get(channelId);

      if (
        !channel ||
        !channel.isTextBased() ||
        channel.type !== ChannelType.GuildText
      ) {
        console.log(`${clc.red("✗")} Invalid channel ID or not a text channel`);
        return;
      }

      const updateInterval =
        (this.client.config.get("statusEmbed.updateInterval") as number) ||
        5 * 60 * 1000; // Default 5 minutes

      console.log(
        `${clc.green("✓")} Starting status updates in channel ${clc.magenta(channelId)}`,
      );
      console.log(
        `${clc.yellow("⚡")} Update interval: ${clc.magenta(updateInterval / 1000)}s`,
      );

      await createStatusEmbed(this.client, channel, updateInterval);

      console.log(`${clc.green("✓")} Status updates started successfully`);
    });

    this.commands.set("stopstatus", async (args) => {
      if (!args || args.length === 0) {
        console.log(`${clc.red("✗")} Please provide a channel ID`);
        return;
      }

      const channelId = args[0];

      if (this.client.statusUpdateIntervals?.has(channelId)) {
        clearInterval(this.client.statusUpdateIntervals.get(channelId));
        this.client.statusUpdateIntervals.delete(channelId);
        console.log(
          `${clc.green("✓")} Status updates stopped for channel ${clc.magenta(channelId)}`,
        );
      } else {
        console.log(
          `${clc.red("✗")} No active status updates for channel ${clc.magenta(channelId)}`,
        );
      }
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
