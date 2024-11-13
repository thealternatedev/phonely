import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../CommandManager.js";
import { PhonelyClient } from "../Phonely.js";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds.js";

const ConnectCommand: Command = {
  name: "connect",
  aliases: ["c"],

  // Add slash command data
  data: new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect to another channel waiting for a call"),

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

    await client.userPhoneConnections.connect(
      interaction.channel,
      async (embed) => {
        await interaction.reply({ embeds: [embed] });
      },
    );
  },

  // Handler for message commands
  async executeMessage(
    client: PhonelyClient,
    message: Message,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;

    await client.userPhoneConnections.connect(
      message.channel,
      async (embed) => {
        await message.reply({ embeds: [embed] });
      },
    );
  },
};

export default ConnectCommand;
