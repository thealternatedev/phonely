import {
  Message,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Colors,
  version as discordJSVersion,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";
import os from "os";

// Cache static values
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
const MB_CONVERSION = 1024 * 1024;
const GB_CONVERSION = MB_CONVERSION * 1024;

// Pre-compute embed templates
const loadingEmbed = new EmbedBuilder()
  .setColor(Colors.Yellow)
  .setTitle("🔄 Gathering System Metrics...")
  .setDescription("⏳ Please wait while I collect detailed diagnostics...")
  .setTimestamp();

const PingCommand: Command = {
  name: "ping",
  aliases: ["p", "latency", "status"],

  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("🏓 Check detailed bot status, latency and system metrics"),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    handlePing(client, interaction);
  },

  async executeMessage(client: PhonelyClient, message: Message) {
    handlePing(client, message);
  },
};

async function handlePing(
  client: PhonelyClient,
  context: Message | ChatInputCommandInteraction,
) {
  // Send loading message immediately
  const sent = await (context instanceof Message
    ? context.reply({ embeds: [loadingEmbed] })
    : context.reply({ embeds: [loadingEmbed], fetchReply: true }));

  // Calculate metrics in parallel
  const [latency, wsLatency, uptimeStr, memoryStats] = await Promise.all([
    calculateLatency(sent, context),
    client.ws.ping,
    calculateUptime(),
    getMemoryStats(),
  ]);

  const qualityEmbed = new EmbedBuilder()
    .setColor(getLatencyColor(latency))
    .setTitle("🏓 Pong! Detailed System Status")
    .setDescription("📊 Here's a comprehensive overview of system metrics:")
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
      {
        name: "⏰ Uptime",
        value: uptimeStr,
        inline: true,
      },
      {
        name: "💾 Memory Usage",
        value: memoryStats,
        inline: true,
      },
      {
        name: "🤖 Bot Info",
        value: `Discord.js: \`v${discordJSVersion}\`\nNode.js: \`${process.version}\``,
        inline: true,
      },
    )
    .setFooter({ text: "🔍 Phonely Network Advanced Diagnostics" })
    .setTimestamp();

  return context instanceof Message
    ? sent.edit({ embeds: [qualityEmbed] })
    : context.editReply({ embeds: [qualityEmbed] });
}

// Split out calculations into separate pure functions for better performance
function calculateLatency(
  sent: Message,
  context: Message | ChatInputCommandInteraction,
): number {
  return sent.createdTimestamp - context.createdTimestamp;
}

function calculateUptime(): string {
  const uptime = process.uptime();
  const days = Math.floor(uptime / SECONDS_PER_DAY);
  const hours = Math.floor((uptime % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
  const minutes = Math.floor((uptime % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = Math.floor(uptime % SECONDS_PER_MINUTE);
  return `\`${days}d ${hours}h ${minutes}m ${seconds}s\``;
}

function getMemoryStats(): string {
  const memUsage = process.memoryUsage();
  const memoryUsed = (memUsage.heapUsed / MB_CONVERSION).toFixed(2);
  const memoryTotal = (os.totalmem() / GB_CONVERSION).toFixed(2);
  const memoryFree = (os.freemem() / GB_CONVERSION).toFixed(2);
  return `Used: \`${memoryUsed} MB\`\nFree: \`${memoryFree} GB\`\nTotal: \`${memoryTotal} GB\``;
}

// Use lookup maps instead of if-else chains
const latencyColors = new Map([
  [100, Colors.Green],
  [200, Colors.Yellow],
  [400, Colors.Orange],
]);

function getLatencyColor(latency: number): number {
  for (const [threshold, color] of latencyColors) {
    if (latency < threshold) return color;
  }
  return Colors.Red;
}

const latencyIndicators = new Map([
  [100, "🟢 Excellent"],
  [200, "🟡 Good"],
  [400, "🟠 Fair"],
]);

function getLatencyIndicator(latency: number): string {
  for (const [threshold, indicator] of latencyIndicators) {
    if (latency < threshold) return indicator;
  }
  return "🔴 Poor";
}

export default PingCommand;
