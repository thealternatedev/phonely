import {
  Collection,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Awaitable,
  Message,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { PhonelyClient } from "./Phonely";
import clc from "cli-color";

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
  data?: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  aliases?: string[];
  cooldown?: number;
}

export class CommandManager {
  private commands = new Collection<string, Command>();
  private readonly aliases = new Collection<string, string>();
  private readonly commandsPath: string;
  private cooldowns = new Collection<string, Collection<string, number>>();
  private readonly commandCache = new Map<string, Command>();

  constructor() {
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

      await Promise.all(commandFiles.map((file) => this.loadCommand(file)));

      const loadedCount = this.commands.size;
      const skippedCount = commandFiles.length - loadedCount;

      console.log(
        clc.cyan(`📊 Command Loading Summary:
   ${clc.green("✓")} Successfully loaded: ${loadedCount}
   ${clc.red("✗")} Skipped/Failed: ${skippedCount}
   📚 Total commands: ${loadedCount}`),
      );
    } catch (error) {
      console.error(clc.red("❌ Critical error loading commands:"), error);
      throw error;
    }
  }

  async reloadCommands() {
    try {
      console.log(clc.blue("🔄 Starting command reload..."));

      const commandFiles = readdirSync(this.commandsPath).filter((file) =>
        /\.[jt]s$/.test(file),
      );

      for (const file of commandFiles) {
        delete require.cache[require.resolve(join(this.commandsPath, file))];
      }

      this.commands.clear();
      this.aliases.clear();
      this.cooldowns.clear();
      this.commandCache.clear();

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
    this.commandCache.set(command.name, command);
    command.aliases?.forEach((alias) => {
      this.aliases.set(alias, command.name);
      this.commandCache.set(alias, command);
    });
    console.log(clc.green(`✅ Loaded command: ${command.name}`));
  }

  async loadRestCommands(client: PhonelyClient) {
    try {
      console.log(clc.blue("🔄 Starting REST command registration..."));

      const token = client.isDevelopment
        ? process.env.DiscordDevelopmentToken!
        : process.env.DiscordToken!;
      const rest = new REST().setToken(token);

      const commandsData = [...this.commands.values()]
        .filter((cmd) => cmd.data)
        .map((cmd) => cmd.data!.toJSON());

      console.log(
        clc.cyan(
          `⚙️ Registering ${commandsData.length} application commands...`,
        ),
      );

      const result = (await rest.put(
        Routes.applicationCommands(client.user!.id),
        { body: commandsData },
      )) as any[];

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
      const command =
        this.commandCache.get(commandName) ||
        this.commandCache.get(this.aliases.get(commandName) || "");

      if (!command) return;

      const userId =
        source instanceof ChatInputCommandInteraction
          ? source.user.id
          : source.author.id;
      const cooldownKey = `${command.name}-${userId}`;
      const now = Date.now();
      const cooldownAmount = (command.cooldown || 3) * 1000;

      const userCooldowns =
        this.cooldowns.get(command.name) || new Collection();
      const expirationTime = userCooldowns.get(userId);

      if (expirationTime && now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        const errorMessage = `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`;

        return source instanceof ChatInputCommandInteraction
          ? source.reply({ content: errorMessage, ephemeral: true })
          : source.reply(errorMessage);
      }

      userCooldowns.set(userId, now + cooldownAmount);
      this.cooldowns.set(command.name, userCooldowns);

      if (source instanceof ChatInputCommandInteraction) {
        await command.execute(client, source);
      } else if (command.executeMessage) {
        await command.executeMessage(client, source, args);
      }
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
    return this.commandCache.get(name);
  }

  private isValidCommand(command: any): command is Command {
    return command?.name && typeof command.execute === "function";
  }
}
