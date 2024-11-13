import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  User,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds";

// Helper function to handle common connection logic
async function handleConnect(
  client: PhonelyClient,
  channel: TextChannel,
  user: User,
  reply: (
    embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
  ) => Promise<void>,
) {
  if (!(channel instanceof TextChannel)) {
    await reply(
      createErrorEmbed("📝 This command can only be used in text channels!"),
    );
    return;
  }

  // Check if user is banned
  if (await client.phonelyService.isUserBanned(user)) {
    await reply(
      createErrorEmbed("🚫 You are banned from using the phone system."),
    );
    return;
  }

  await client.userPhoneConnections.connect(channel, reply, user);
}

const ConnectCommand: Command = {
  name: "connect",
  aliases: ["c"],

  data: new SlashCommandBuilder()
    .setName("connect")
    .setDescription("📞 Connect to another channel waiting for a call"),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    await handleConnect(
      client,
      interaction.channel as TextChannel,
      interaction.user,
      async (embed) => {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      },
    );
  },

  async executeMessage(
    client: PhonelyClient,
    message: Message<true>,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;
    await handleConnect(
      client,
      message.channel,
      message.author,
      async (embed) => {
        await message.reply({ embeds: [embed] });
      },
    );
  },
};

export default ConnectCommand;
