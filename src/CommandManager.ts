import {
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Awaitable,
  Message,
} from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { PhonelyClient } from "./Phonely.js";
import * as clc from "cli-color";

export interface Command {
  name: string;
  execute: (
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) => Awaitable<void>;
  executeMessage?: (
    client: PhonelyClient,
    message: Message<true>,
    args: string[],
  ) => Awaitable<void>;
  data?: SlashCommandBuilder;
  aliases?: string[];
}

export class CommandManager {
  private commands = new Collection<string, Command>();
  private readonly aliases = new Collection<string, string>();
  private readonly commandsPath: string;

  constructor() {
    // Using process.cwd() to get the project root directory
    this.commandsPath = join(process.cwd(), "build", "commands");
  }

  getCommands() {
    return this.commands;
  }

  async loadCommands() {
    try {
      const commandFiles = readdirSync(this.commandsPath).filter((file) =>
        /\.[jt]s$/.test(file),
      );

      console.log(clc.blue(`📁 Found ${commandFiles.length} command files`));

      const results = await Promise.allSettled(
        commandFiles.map((file) => this.loadCommand(file)),
      );

      const loadedCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const skippedCount = results.filter(
        (r) => r.status === "rejected",
      ).length;

      console.log(
        clc.cyan(`📊 Command Loading Summary:
   ${clc.green("✓")} Successfully loaded: ${loadedCount}
   ${clc.red("✗")} Skipped/Failed: ${skippedCount}
   📚 Total commands: ${this.commands.size}`),
      );
    } catch (error) {
      console.error(clc.red("❌ Critical error loading commands:"), error);
      throw error;
    }
  }

  async reloadCommands() {
    try {
      console.log(clc.blue("🔄 Starting command reload..."));

      // Get current command files
      const commandFiles = readdirSync(this.commandsPath).filter((file) =>
        /\.[jt]s$/.test(file),
      );

      // Clear module cache to force reloading
      for (const file of commandFiles) {
        const fullPath = join(this.commandsPath, file);
        delete require.cache[require.resolve(fullPath)];
      }

      // Clear existing commands and aliases
      this.commands.clear();
      this.aliases.clear();

      // Reload all commands
      await this.loadCommands();

      console.log(
        clc.green("✨ Successfully reloaded all commands with latest changes!"),
      );
    } catch (error) {
      console.error(clc.red("❌ Failed to reload commands:"), error);
      throw error;
    }
  }

  private async loadCommand(file: string) {
    const command = require(join(this.commandsPath, file)).default;

    if (!this.isValidCommand(command)) {
      console.warn(clc.yellow(`⚠️ Skipped invalid command in file: ${file}`));
      throw new Error("Invalid command");
    }

    this.commands.set(command.name, command);
    command.aliases?.forEach((alias) => this.aliases.set(alias, command.name));
    console.log(clc.green(`✅ Loaded command: ${command.name}`));
  }

  async loadRestCommands(clientId: string) {
    try {
      console.log(clc.blue("🔄 Starting REST command registration..."));

      const rest = new REST().setToken(process.env.DiscordToken!);
      const commandsData = [...this.commands.values()]
        .filter((cmd) => cmd.data)
        .map((cmd) => cmd.data!.toJSON());

      console.log(
        clc.cyan(
          `⚙️ Registering ${commandsData.length} application commands...`,
        ),
      );

      const result = (await rest.put(Routes.applicationCommands(clientId), {
        body: commandsData,
      })) as any[];

      console.log(
        clc.green("✨ Successfully registered application commands!"),
      );
      console.log(
        clc.blue(`📡 Registered ${result.length} commands with Discord API`),
      );
    } catch (error) {
      console.error(clc.red("❌ Failed to register REST commands:"), error);
      throw error;
    }
  }

  async executeCommand(
    client: PhonelyClient,
    source: ChatInputCommandInteraction<"cached"> | Message<true>,
    commandName: string,
    args: string[] = [],
  ) {
    try {
      if (source instanceof ChatInputCommandInteraction) {
        const command = this.getCommand(commandName);
        if (!command) return;
        await command.execute(client, source);
        return;
      }

      const command =
        this.getCommand(commandName) ||
        this.getCommand(this.aliases.get(commandName) || "");
      if (!command?.executeMessage) return;
      await command.executeMessage(client, source, args);
    } catch (error) {
      console.error(clc.red(`Error executing command ${commandName}:`), error);

      const errorMessage = "There was an error executing this command!";
      if (source instanceof ChatInputCommandInteraction) {
        await (source.replied || source.deferred
          ? source.editReply(errorMessage)
          : source.reply({ content: errorMessage, ephemeral: true }));
      } else {
        await source.reply(errorMessage);
      }
    }
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  private isValidCommand(command: any): command is Command {
    return command?.name && typeof command.execute === "function";
  }
}
