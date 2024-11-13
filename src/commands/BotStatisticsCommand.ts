import {
  Message,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";

const formatUptime = (uptime: number): string => {
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const command: Command = {
  name: "stats",
  aliases: ["statistics", "botinfo", "info"],

  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("📊 View bot statistics"),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    const embed = createStatsEmbed(client);
    await interaction.reply({ embeds: [embed] });
  },

  async executeMessage(client: PhonelyClient, message: Message) {
    const embed = createStatsEmbed(client);
    await message.reply({ embeds: [embed] });
  },
};

const createStatsEmbed = (client: PhonelyClient): EmbedBuilder => {
  return new EmbedBuilder()
    .setColor(Colors.Blue)
    .setTitle("📊 Phonely Bot Statistics")
    .setDescription("Here's what I've been up to!")
    .addFields(
      {
        name: "🤖 Bot Information",
        value: [
          `**Name:** ${client.user?.tag}`,
          `**Created:** ${client.user?.createdAt.toLocaleDateString()}`,
          `**Uptime:** ${formatUptime(client.uptime ?? 0)}`,
          `**Commands:** ${client.commandManager.getCommands().size}`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "📈 Statistics",
        value: [
          `**Servers:** ${client.guilds.cache.size}`,
          `**Users:** ${client.users.cache.size}`,
          `**Channels:** ${client.channels.cache.size}`,
          `**Ping:** ${client.ws.ping}ms`,
        ].join("\n"),
        inline: true,
      },
    )
    .setFooter({ text: "Made with ❤️ by Phonely Team" })
    .setTimestamp();
};

export default command;
