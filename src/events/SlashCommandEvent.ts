import { ChatInputCommandInteraction } from "discord.js";
import { PhonelyClient } from "../Phonely";

export default {
  name: "interactionCreate",
  execute: async (
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) => {
    // Fast type check using property access
    if (!("commandName" in interaction)) return;

    // Execute command directly without variable assignment
    await client.commandManager.executeCommand(
      client,
      interaction,
      interaction.commandName,
    );
  },
};
