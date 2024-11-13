import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Collection,
} from "discord.js";
import { Command } from "../CommandManager.js";
import { PhonelyClient } from "../Phonely.js";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds.js";

// This should be accessed from a central state management system

const DisconnectCommand: Command = {
  name: "disconnect",
  aliases: ["d", "hangup"],

  data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("End your current active call"),

  // Handler for slash commands
  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    if (!(interaction.channel instanceof TextChannel)) {
      interaction.reply({
        embeds: [
          createErrorEmbed("This command can only be used in text channels!"),
        ],
        ephemeral: true,
      });
      return;
    }

    const serverEntry = Array.from(client.connectedServers.entries()).find(
      ([_, server]) =>
        server.getCallerSideChannel().id === interaction.channel!.id ||
        server.getReceiverSideChannel().id === interaction.channel!.id,
    );

    if (!serverEntry) {
      await interaction.reply({
        embeds: [createErrorEmbed("This channel is not in any active call!")],
      });
      return;
    }

    await client.userPhoneConnections.disconnect(serverEntry[0]);
    await interaction.reply({
      embeds: [createSuccessEmbed("Call ended successfully!")],
    });
  },

  // Handler for message commands
  async executeMessage(
    client: PhonelyClient,
    message: Message,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;

    const serverEntry = Array.from(client.connectedServers.entries()).find(
      ([_, server]) =>
        server.getCallerSideChannel().id === message.channel.id ||
        server.getReceiverSideChannel().id === message.channel.id,
    );

    if (!serverEntry) {
      await message.reply({
        embeds: [createErrorEmbed("This channel is not in any active call!")],
      });
      return;
    }

    await client.userPhoneConnections.disconnect(serverEntry[0]);
    await message.reply({
      embeds: [createSuccessEmbed("Call ended successfully!")],
    });
  },
};

export default DisconnectCommand;
