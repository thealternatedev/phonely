import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  User,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";
import { createErrorEmbed } from "../utils/embeds";

// Configure the duration (in seconds) for temporary calls
const TEMP_CALL_DURATION = 30; // 30 seconds

const TempCallCommand: Command = {
  name: "tempcall",
  aliases: ["tc", "temporary"],

  data: new SlashCommandBuilder()
    .setName("tempcall")
    .setDescription(
      `📞 Start a ${TEMP_CALL_DURATION}-second temporary call with a random channel`,
    ),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            "❌ This command can only be used in text channels!",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await handleTempCall(
      client,
      interaction.channel,
      interaction.user,
      async (embed) => {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      },
    );
  },

  async executeMessage(
    client: PhonelyClient,
    message: Message,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;

    await handleTempCall(
      client,
      message.channel,
      message.author,
      async (embed) => {
        await message.reply({ embeds: [embed] });
      },
    );
  },
};

async function handleTempCall(
  client: PhonelyClient,
  channel: TextChannel,
  user: User,
  reply: (embed: ReturnType<typeof createErrorEmbed>) => Promise<void>,
) {
  // Check if user is banned
  if (await client.phonelyService.isUserBanned(user)) {
    await reply(
      createErrorEmbed("🚫 You are banned from using the phone system."),
    );
    return;
  }

  await client.userPhoneConnections.tempConnect(
    channel,
    TEMP_CALL_DURATION * 1000,
    reply,
    user,
  );
}

export default TempCallCommand;
