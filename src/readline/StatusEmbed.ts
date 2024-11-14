import { ActivityType, ChannelType, Client, EmbedBuilder, GatewayIntentBits, TextChannel } from "discord.js";
import { PhonelyClient } from "../Phonely";

const statusBot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

statusBot.on('ready', () => {
  console.log('Status bot is ready!');
  statusBot.user?.setActivity('phone calls', { type: ActivityType.Watching });
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

  const updateEmbed = async () => {
    const activeConnections = 
      client.userPhoneConnections.getActiveConnections();
    const activeServers = client.userPhoneConnections.getActiveServers();
    const queueSize = client.channelQueue.size();

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
            "• Total Guilds: " + client.guilds.cache.size,
            "• Total Users: " +
              client.guilds.cache.reduce(
                (acc, guild) => acc + guild.memberCount,
                0,
              ),
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
        },
      )
      .setTimestamp()
      .setFooter({
        text: "Updates every " + intervalMs / 1000 + " seconds • Last updated",
      });

    // Get the channel through status bot instead
    const statusChannel = await statusBot.channels.fetch(channel.id);
    if (!statusChannel || !statusChannel.isTextBased() || statusChannel.type !== ChannelType.GuildText) return;

    const messages = await statusChannel.messages.fetch({ limit: 1 });
    const statusMessage = messages.first();

    if (statusMessage) {
      await statusMessage.edit({ embeds: [embed] });
    } else {
      await statusChannel.send({ embeds: [embed] });
    }
  };

  await updateEmbed();
  const interval = setInterval(updateEmbed, intervalMs);
  client.statusUpdateIntervals.set(channel.id, interval);
  return interval;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}
