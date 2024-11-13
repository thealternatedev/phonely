import {
  Message,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
} from "discord.js";
import { Command } from "../CommandManager.js";
import { PhonelyClient } from "../Phonely.js";
import { createSuccessEmbed } from "../utils/embeds.js";

const PingCommand: Command = {
  name: "ping",
  aliases: ["p", "latency"],

  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Check the bot's connection status and response time"),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    const loadingEmbed = new EmbedBuilder()
      .setColor(Colors.Yellow)
      .setTitle("🔄 Measuring Connection...")
      .setDescription("Please wait while I calculate response times...")
      .setTimestamp();

    const sent = await interaction.reply({
      embeds: [loadingEmbed],
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = client.ws.ping;

    const qualityEmbed = new EmbedBuilder()
      .setColor(getLatencyColor(latency))
      .setTitle("🏓 Pong! Connection Status")
      .setDescription("Here are your connection metrics:")
      .addFields(
        {
          name: "📡 API Latency",
          value: `\`${latency}ms\` ${getLatencyIndicator(latency)}`,
          inline: true,
        },
        {
          name: "⚡ WebSocket Latency",
          value: `\`${wsLatency}ms\` ${getLatencyIndicator(wsLatency)}`,
          inline: true,
        },
      )
      .setFooter({ text: "Phonely Network Diagnostics" })
      .setTimestamp();

    await interaction.editReply({ embeds: [qualityEmbed] });
  },

  async executeMessage(client: PhonelyClient, message: Message) {
    const loadingEmbed = new EmbedBuilder()
      .setColor(Colors.Yellow)
      .setTitle("🔄 Measuring Connection...")
      .setDescription("Please wait while I calculate response times...")
      .setTimestamp();

    const sent = await message.reply({
      embeds: [loadingEmbed],
    });

    const latency = sent.createdTimestamp - message.createdTimestamp;
    const wsLatency = client.ws.ping;

    const qualityEmbed = new EmbedBuilder()
      .setColor(getLatencyColor(latency))
      .setTitle("🏓 Pong! Connection Status")
      .setDescription("Here are your connection metrics:")
      .addFields(
        {
          name: "📡 API Latency",
          value: `\`${latency}ms\` ${getLatencyIndicator(latency)}`,
          inline: true,
        },
        {
          name: "⚡ WebSocket Latency",
          value: `\`${wsLatency}ms\` ${getLatencyIndicator(wsLatency)}`,
          inline: true,
        },
      )
      .setFooter({ text: "Phonely Network Diagnostics" })
      .setTimestamp();

    await sent.edit({ embeds: [qualityEmbed] });
  },
};

function getLatencyColor(latency: number): number {
  if (latency < 100) return Colors.Green;
  if (latency < 200) return Colors.Yellow;
  return Colors.Red;
}

function getLatencyIndicator(latency: number): string {
  if (latency < 100) return "🟢 Excellent";
  if (latency < 200) return "🟡 Good";
  if (latency < 400) return "🟠 Fair";
  return "🔴 Poor";
}

export default PingCommand;
