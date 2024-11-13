import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../CommandManager.js";
import { PhonelyClient } from "../Phonely.js";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds.js";

// Configure the duration (in seconds) for temporary calls
const TEMP_CALL_DURATION = 30; // 30 seconds

const TempCallCommand: Command = {
  name: "tempcall",
  aliases: ["tc", "temporary"],

  data: new SlashCommandBuilder()
    .setName("tempcall")
    .setDescription(
      `Start a ${TEMP_CALL_DURATION}-second temporary call with a random channel`,
    ),

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

    await client.userPhoneConnections.tempConnect(
      interaction.channel,
      TEMP_CALL_DURATION * 1000,
      async (embed) => {
        await interaction.reply({ embeds: [embed] });
      },
    );
  },

  async executeMessage(
    client: PhonelyClient,
    message: Message,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;

    await client.userPhoneConnections.tempConnect(
      message.channel,
      TEMP_CALL_DURATION * 1000,
      async (embed) => {
        await message.reply({ embeds: [embed] });
      },
    );
  },
};

export default TempCallCommand;
