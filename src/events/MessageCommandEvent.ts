import { Message } from "discord.js";
import { PhonelyClient } from "../Phonely";

export default {
  name: "messageCreate",
  execute: async (client: PhonelyClient, message: Message) => {
    // Ignore bot messages
    if (message.author.bot) return;
    if (!message.guild) return;

    // Get prefix from environment variable or use default
    const prefix = process.env.PREFIX || ".";

    // Check if message starts with prefix
    if (!message.content.startsWith(prefix)) return;

    // Split message into command and arguments
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    // Execute command with arguments
    await client.commandManager.executeCommand(
      client,
      message as Message<true>,
      commandName,
      args,
    );
  },
};
