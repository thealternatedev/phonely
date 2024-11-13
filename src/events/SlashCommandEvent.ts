import { ChatInputCommandInteraction } from "discord.js";
import { PhonelyClient } from "../Phonely";

export default {
  name: "interactionCreate",
  execute: async (
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) => {
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) return;

    // Get command name and execute it
    const commandName = interaction.commandName;
    await client.commandManager.executeCommand(
      client,
      interaction,
      commandName,
    );
  },
};
