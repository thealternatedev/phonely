import { createInterface } from "readline";
import { PhonelyClient } from "../Phonely";
import clc from "cli-color";
import { ChannelType } from "discord.js";
import { createStatusEmbed } from "./StatusEmbed";

export class CustomInterface {
  private readonly rl;
  private readonly client: PhonelyClient;
  private readonly commands: Map<string, (args?: string[]) => Promise<void>>;

  constructor(client: PhonelyClient) {
    this.client = client;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: clc.cyan("📞 ") + clc.magenta("Phonely") + clc.cyan(" ➜ "),
    });

    // Initialize commands map with capacity
    this.commands = new Map();

    // Pre-compile color functions
    const yellow = clc.yellow;
    const cyan = clc.cyan;
    const magenta = clc.magenta;
    const green = clc.green;
    const red = clc.red;
    const blue = clc.blue;
    const white = clc.white;
    const blackBright = clc.blackBright;

    // Register commands using optimized handlers
    this.commands.set("reload", async () => {
      console.log(
        `${yellow("⚡")} ${cyan("Reloading")} ${magenta("commands")}...`,
      );
      await this.client.commandManager.reloadCommands();
    });

    this.commands.set("clear", async () => {
      const separator = yellow(
        "✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦",
      );
      const memoryUsage = Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024,
      );

      console.clear();
      console.log("\n");
      console.log(separator);
      console.log(
        cyan("                      📞 PHONELY BOT                        "),
      );
      console.log(separator);
      console.log("");
      console.log(blue("  🤖 Bot User      : ") + white(client.user?.tag));
      console.log(
        blue("  🌐 Servers       : ") + white(client.guilds.cache.size),
      );
      console.log(blue("  ⚡ Status        : ") + green("Online"));
      console.log(
        blue("  ⏰ Started At    : ") + white(new Date().toLocaleString()),
      );
      console.log(blue("  📦 Version       : ") + white("v1.0.0"));
      console.log(blue("  🔧 Node.js       : ") + white(process.version));
      console.log(blue("  💾 Memory Usage  : ") + white(`${memoryUsage}MB`));
      console.log("");
      console.log(magenta("  ✨ Features:"));
      console.log(cyan("     🎲 Random Channel Roulette"));
      console.log(cyan("     🎯 Direct Channel Connections"));
      console.log(cyan("     ⏱️ Timed Speed Calls"));
      console.log(cyan("     👥 Multi-Channel Conferences"));
      console.log(cyan("     📊 Live Status Updates"));
      console.log("");
      console.log(
        yellow(
          "* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *",
        ),
      );
      console.log(
        green("              ✨ Ready to make connections! ✨              "),
      );
      console.log(
        yellow(
          "* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *",
        ),
      );
      console.log("\n");
    });

    this.commands.set("exit", async () => {
      console.log(`${yellow("👋")} ${cyan("Executing")} ${magenta("exit")}...`);
      this.client.destroy();
      process.exit(0);
    });

    this.commands.set("help", async () => {
      console.log(yellow("\n📚 Available Commands:"));
      console.log(blackBright("━".repeat(30)));
      for (const cmd of this.commands.keys()) {
        console.log(`${cyan("➜")} ${magenta(cmd)}`);
      }
      console.log();
    });

    this.commands.set("stats", async () => {
      const stats = [
        ["Servers", this.client.guilds.cache.size],
        ["Users", this.client.users.cache.size],
        ["Uptime", Math.floor(this.client.uptime! / 1000) + "s"],
      ];

      console.log(yellow("\n📊 Bot Statistics:"));
      console.log(blackBright("━".repeat(30)));
      stats.forEach(([label, value]) => {
        console.log(`${cyan("➜")} ${label}: ${magenta(value)}`);
      });
      console.log();
    });

    this.commands.set("reloadconfig", async () => {
      console.log(
        `${yellow("⚡")} ${cyan("Reloading")} ${magenta("configuration")}...`,
      );
      this.client.config.reload();
      console.log(`${green("✓")} Configuration reloaded successfully!`);
    });

    this.commands.set("guilds", async () => {
      const specialGuildId = "1306277925745721487";
      const guildsCache = this.client.guilds.cache;

      console.log(yellow("\n🌐 Connected Guilds:"));
      console.log(blackBright("━".repeat(30)));

      const specialGuild = guildsCache.get(specialGuildId);
      if (specialGuild) {
        console.log(yellow("\n📌 Special Guild:"));
        console.log(
          `${cyan("➜")} ${magenta(specialGuild.name)} ${blackBright(`(${specialGuild.id})`)} - ${yellow(specialGuild.memberCount)} members`,
        );
      }

      console.log(yellow("\n🌍 Other Guilds:"));
      guildsCache.forEach((guild) => {
        if (guild.id !== specialGuildId) {
          console.log(
            `${cyan("➜")} ${magenta(guild.name)} ${blackBright(`(${guild.id})`)} - ${yellow(guild.memberCount)} members`,
          );
        }
      });
      console.log();
    });

    this.commands.set("statusembed", async (args) => {
      if (!args?.length) {
        console.log(`${red("✗")} Please provide a channel ID`);
        return;
      }

      const channelId = args[0];
      const channel = this.client.channels.cache.get(channelId);

      if (!channel?.isTextBased() || channel.type !== ChannelType.GuildText) {
        console.log(`${red("✗")} Invalid channel ID or not a text channel`);
        return;
      }

      const updateInterval =
        (this.client.config.get("statusEmbed.updateInterval") as number) ||
        300000;

      console.log(
        `${green("✓")} Starting status updates in channel ${magenta(channelId)}`,
      );
      console.log(
        `${yellow("⚡")} Update interval: ${magenta(updateInterval / 1000)}s`,
      );

      await createStatusEmbed(this.client, channel, updateInterval);
      console.log(`${green("✓")} Status updates started successfully`);
    });

    this.commands.set("stopstatus", async (args) => {
      if (!args?.length) {
        console.log(`${red("✗")} Please provide a channel ID`);
        return;
      }

      const channelId = args[0];
      const intervals = this.client.statusUpdateIntervals;

      if (intervals?.has(channelId)) {
        clearInterval(intervals.get(channelId));
        intervals.delete(channelId);
        console.log(
          `${green("✓")} Status updates stopped for channel ${magenta(channelId)}`,
        );
      } else {
        console.log(
          `${red("✗")} No active status updates for channel ${magenta(channelId)}`,
        );
      }
    });

    this.start();
  }

  private start() {
    this.rl.prompt();

    this.rl.on("line", async (line) => {
      const [command, ...args] = line.trim().split(" ");
      const cmd = this.commands.get(command);

      if (cmd) {
        try {
          await cmd(args);
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
