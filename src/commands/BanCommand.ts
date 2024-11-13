import {
  Message,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  PermissionFlagsBits,
  User,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds";

const BanCommand: Command = {
  name: "ban",
  aliases: ["banuser", "blockuser"],

  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription(
      "🚫 Ban a user from using Phonely commands (Managable by Bot Staff)",
    )
    .addStringOption((option) =>
      option
        .setName("user")
        .setDescription("👤 The user ID or mention to ban")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("📝 Reason for the ban")
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    const banRoleId = client.config.get<string>("moderation.banRoleId");
    if (!banRoleId || !interaction.member.roles.cache.has(banRoleId)) {
      interaction.reply({
        embeds: [
          createErrorEmbed(
            "❌ You don't have the required role to use this command!",
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

    const reason =
      interaction.options.getString("reason") || "📝 No reason provided";
    await handleBan(client, interaction, targetUser, reason);
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
            "❌ You don't have the required role to use this command!",
          ),
        ],
      });
      return;
    }

    if (!args.length) {
      message.reply({
        embeds: [
          createErrorEmbed("❌ Please provide a user ID or mention to ban!"),
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

    const reason = args.slice(1).join(" ") || "📝 No reason provided";
    await handleBan(client, message, targetUser, reason);
  },
};

async function handleBan(
  client: PhonelyClient,
  context: Message | ChatInputCommandInteraction,
  targetUser: User,
  reason: string,
) {
  // Don't allow banning the bot itself
  if (targetUser.id === client.user?.id) {
    return context.reply({
      embeds: [createErrorEmbed("❌ I cannot ban myself!")],
    });
  }

  try {
    const wasBanned = await client.phonelyService.serviceBan(targetUser);

    if (!wasBanned) {
      return context.reply({
        embeds: [createErrorEmbed(`❌ ${targetUser.tag} is already banned!`)],
      });
    }

    const banEmbed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setTitle("🚫 User Banned")
      .setDescription(
        `🔨 ${targetUser.tag} has been banned from using Phonely commands`,
      )
      .addFields(
        { name: "👤 User ID", value: targetUser.id, inline: true },
        { name: "📝 Reason", value: reason, inline: true },
      )
      .setTimestamp();

    return context.reply({ embeds: [banEmbed] });
  } catch (error) {
    console.error("Error in ban command:", error);
    return context.reply({
      embeds: [
        createErrorEmbed("❌ An error occurred while trying to ban the user"),
      ],
    });
  }
}

export default BanCommand;
