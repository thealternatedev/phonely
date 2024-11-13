import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds";

const DisconnectCommand: Command = {
  name: "disconnect",
  aliases: ["d", "hangup"],

  data: new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("End your current active call"),

  // Helper function to handle disconnection logic

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        embeds: [
          createErrorEmbed("This command can only be used in text channels!"),
        ],
        ephemeral: true,
      });
      return;
    }

    await handleDisconnect(client, interaction.channel, async (embed) => {
      await interaction.reply({ embeds: [embed] });
    });
  },

  async executeMessage(
    client: PhonelyClient,
    message: Message<true>,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;

    await handleDisconnect(client, message.channel, async (embed) => {
      await message.reply({ embeds: [embed] });
    });
  },
};

async function handleDisconnect(
  client: PhonelyClient,
  channel: TextChannel,
  reply: (
    embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
  ) => Promise<void>,
) {
  const serverEntry = client.activeServers.getIds().find((id) => {
    const server = client.activeServers.get(id);
    return (
      server?.getCallerSideChannel().id === channel.id ||
      server?.getReceiverSideChannel().id === channel.id
    );
  });

  if (!serverEntry) {
    await reply(createErrorEmbed("This channel is not in any active call!"));
    return;
  }

  await client.userPhoneConnections.disconnect(serverEntry);
  await reply(createSuccessEmbed("Call ended successfully!"));
}

export default DisconnectCommand;
