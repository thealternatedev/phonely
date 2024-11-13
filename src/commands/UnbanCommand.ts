import {
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
  User,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds";

const UnbanCommand: Command = {
  name: "unban",
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription(
      "🔓 Unban a user from using the phone system (Managable by Bot Staff)",
    )
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("👤 The user ID or mention to unban")
        .setRequired(true),
    ),

  aliases: ["unbanuser", "unblockuser"],

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    const banRoleId = client.config.get<string>("moderation.banRoleId");
    if (!banRoleId || !interaction.member.roles.cache.has(banRoleId)) {
      interaction.reply({
        embeds: [
          createErrorEmbed(
            "⛔ You don't have the required role to use this command!",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const userInput = interaction.options
      .getString("user", true)
      .replace(/[<@!>]/g, "");
    const targetUser = await client.users.fetch(userInput).catch(() => null);

    if (!targetUser) {
      interaction.reply({
        embeds: [createErrorEmbed("❌ Could not find a user with that ID!")],
        ephemeral: true,
      });
      return;
    }

    await handleUnban(client, interaction, targetUser);
  },

  async executeMessage(
    client: PhonelyClient,
    message: Message,
    args: string[],
  ) {
    const banRoleId = client.config.get<string>("moderation.banRoleId");
    if (!banRoleId || !message.member?.roles.cache.has(banRoleId)) {
      message.reply({
        embeds: [
          createErrorEmbed(
            "⛔ You don't have the required role to use this command!",
          ),
        ],
      });
      return;
    }

    if (!args.length) {
      message.reply({
        embeds: [
          createErrorEmbed("❗ Please provide a user ID or mention to unban!"),
        ],
      });
      return;
    }

    const userInput = args[0].replace(/[<@!>]/g, "");
    const targetUser = await client.users.fetch(userInput).catch(() => null);

    if (!targetUser) {
      message.reply({
        embeds: [createErrorEmbed("❌ Could not find a user with that ID!")],
      });
      return;
    }

    await handleUnban(client, message, targetUser);
  },
};

async function handleUnban(
  client: PhonelyClient,
  context: Message | ChatInputCommandInteraction,
  targetUser: User,
) {
  try {
    const wasUnbanned = await client.phonelyService.serviceUnban(targetUser);

    if (!wasUnbanned) {
      return context.reply({
        embeds: [createErrorEmbed(`❌ ${targetUser.tag} is not banned!`)],
      });
    }

    const successEmbed = createSuccessEmbed(
      `🔓 ${targetUser.tag} has been unbanned from using Phonely commands`,
    )
      .setTitle("✅ User Unbanned")
      .addFields({ name: "👤 User ID", value: targetUser.id })
      .setTimestamp();

    return context.reply({ embeds: [successEmbed] });
  } catch (error) {
    console.error("Error in unban command:", error);
    return context.reply({
      embeds: [
        createErrorEmbed("⚠️ An error occurred while trying to unban the user"),
      ],
    });
  }
}

export default UnbanCommand;
