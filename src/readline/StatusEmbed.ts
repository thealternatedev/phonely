import {
  ActivityType,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  TextChannel,
} from "discord.js";
import { PhonelyClient } from "../Phonely";

// Initialize status bot with minimal intents
const statusBot = new Client({
  intents: [GatewayIntentBits.Guilds],
});

statusBot.on("ready", () => {
  console.log("Status bot is ready!");
  statusBot.user?.setActivity("phone calls", { type: ActivityType.Watching });
});

export async function createStatusEmbed(
  client: PhonelyClient,
  channel: TextChannel,
  intervalMs: number = 5000,
): Promise<NodeJS.Timeout> {
  // Start status bot if not already started
  if (!statusBot.isReady()) {
    await statusBot.login(process.env.StatusBotToken);
  }

  // Cache channel reference
  const statusChannel = await statusBot.channels.fetch(channel.id);
  if (!statusChannel?.isTextBased() || statusChannel.type !== ChannelType.GuildText) {
    throw new Error("Invalid status channel");
  }

  // Pre-fetch initial message
  const messages = await statusChannel.messages.fetch({ limit: 1 });
  let statusMessage = messages.first();

  const updateEmbed = async () => {
    // Get all stats in parallel
    const [activeConnections, activeServers, queueSize] = await Promise.all([
      client.userPhoneConnections.getActiveConnections(),
      client.userPhoneConnections.getActiveServers(),
      client.channelQueue.size(),
    ]);

    // Calculate guild stats once
    const guildSize = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0
    );

    const embed = new EmbedBuilder()
      .setColor("#FF69B4")
      .setTitle("📞 Phonely Live Status")
      .setDescription(
        "```\n" +
        `🔌 Active Calls: ${activeConnections.length}\n` +
        `🌐 Active Servers: ${activeServers.length}\n` +
        `⏳ In Queue: ${queueSize}\n` +
        "```"
      )
      .addFields(
        {
          name: "📊 Statistics",
          value: [
            "• Total Guilds: " + guildSize,
            "• Total Users: " + totalUsers,
            "• Uptime: " + formatUptime(client.uptime ?? 0),
          ].join("\n"),
          inline: false,
        },
        {
          name: "💡 Quick Tips",
          value: [
            "• Use `/call` to start a random call",
            "• Use `/help` to see all commands",
            "• Calls auto-disconnect after inactivity",
          ].join("\n"),
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({
        text: "Updates every " + intervalMs / 1000 + " seconds • Last updated",
      });

    try {
      if (statusMessage) {
        statusMessage = await statusMessage.edit({ embeds: [embed] });
      } else {
        statusMessage = await statusChannel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error("Failed to update status embed:", error);
    }
  };

  await updateEmbed();
  const interval = setInterval(updateEmbed, intervalMs);
  client.statusUpdateIntervals.set(channel.id, interval);
  return interval;
}

// Memoized uptime formatter using a cache of common values
const uptimeCache = new Map<number, string>();
function formatUptime(ms: number): string {
  const cachedResult = uptimeCache.get(ms);
  if (cachedResult) return cachedResult;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const result = `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  uptimeCache.set(ms, result);
  
  // Prevent memory leaks by limiting cache size
  if (uptimeCache.size > 1000) {
    const firstKey = uptimeCache.keys().next().value;
    uptimeCache.delete(firstKey);
  }
  
  return result;
}
