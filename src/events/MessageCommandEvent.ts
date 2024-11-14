import { Message } from "discord.js";
import { PhonelyClient } from "../Phonely";

export default {
  name: "messageCreate",
  execute: async (client: PhonelyClient, message: Message) => {
    // Early returns for invalid messages
    if (message.author.bot || !message.guild) return;

    // Cache prefix to avoid repeated env lookup
    const prefix = process.env.PREFIX || ".";
    const { content } = message;

    // Fast prefix check
    if (content.charAt(0) !== prefix) return;

    // Optimized argument splitting
    const firstSpace = content.indexOf(" ", prefix.length);
    const commandName =
      firstSpace === -1
        ? content.slice(prefix.length).toLowerCase()
        : content.slice(prefix.length, firstSpace).toLowerCase();

    if (!commandName) return;

    // Only split args if needed
    const args =
      firstSpace === -1 ? [] : content.slice(firstSpace + 1).split(/\s+/);

    // Execute command with arguments
    await client.commandManager.executeCommand(
      client,
      message as Message<true>,
      commandName,
      args,
    );
  },
};
