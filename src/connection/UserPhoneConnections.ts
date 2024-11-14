import { TextChannel, User } from "discord.js";
import { PhonelyClient } from "../Phonely";
import { UserPhoneServer } from "../server/UserPhoneServer";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds";

export class UserPhoneConnections {
  private client: PhonelyClient;

  constructor(client: PhonelyClient) {
    this.client = client;
  }

  public async connect(
    channel: TextChannel,
    reply: (
      embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    ) => Promise<void>,
    callerId: User,
  ) {
    if (this.client.channelQueue.values().includes(channel)) {
      return reply(createErrorEmbed("This channel is already in the queue!"));
    }
    if (this.client.activeServers.hasChannel(channel.id)) {
      return reply(createErrorEmbed("This channel is already in a call!"));
    }

    if (this.client.channelQueue.size() === 0) {
      this.client.channelQueue.enqueue(channel);
      await reply(
        createSuccessEmbed("Waiting for another channel to connect..."),
      );
      return;
    }

    const queuedChannel = this.client.channelQueue.dequeue();
    if (!queuedChannel) return;

    await this.createConnection(queuedChannel, channel, reply, 60000, callerId);
  }

  public async selectiveConnect(
    channel: TextChannel,
    targetChannel: TextChannel,
    reply: (
      embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    ) => Promise<void>,
    callerId: User,
  ) {
    if (
      this.client.activeServers.hasChannel(channel.id) ||
      this.client.activeServers.hasChannel(targetChannel.id)
    ) {
      return reply(
        createErrorEmbed("One or both channels are already in a call!"),
      );
    }

    await this.createConnection(channel, targetChannel, reply, 60000, callerId);
  }

  public async tempConnect(
    channel: TextChannel,
    duration: number,
    reply: (
      embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    ) => Promise<void>,
    callerId: User,
  ) {
    if (this.client.channelQueue.values().includes(channel)) {
      return reply(createErrorEmbed("This channel is already in the queue!"));
    }
    if (this.client.activeServers.hasChannel(channel.id)) {
      return reply(createErrorEmbed("This channel is already in a call!"));
    }

    if (this.client.channelQueue.size() === 0) {
      this.client.channelQueue.enqueue(channel);
      await reply(
        createSuccessEmbed(
          `Waiting for another channel to connect... Connection will last ${duration / 1000} seconds.`,
        ),
      );
      return;
    }

    const queuedChannel = this.client.channelQueue.dequeue();
    if (!queuedChannel) return;

    await this.createConnection(
      queuedChannel,
      channel,
      reply,
      duration,
      callerId,
    );
  }

  private async createConnection(
    channelOne: TextChannel,
    channelTwo: TextChannel,
    reply: (
      embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    ) => Promise<void>,
    duration: number = 60000,
    callerId: User,
  ) {
    const serverId =
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    const phoneServer = new UserPhoneServer(
      this.client,
      channelOne,
      channelTwo,
      callerId,
    );
    this.client.activeServers.add(serverId, phoneServer);

    const successEmbed = createSuccessEmbed(
      `Connected to a channel! You can now chat for ${duration / 1000} seconds before traffic disconnects the call.`,
    );

    await Promise.all([
      channelOne.send({ embeds: [successEmbed] }),
      reply(successEmbed),
    ]);

    setTimeout(async () => {
      await this.disconnect(serverId, "Call duration limit reached");
    }, duration);
  }

  public async disconnect(serverId: string, reason: string = "Unknown reason") {
    const server = this.client.activeServers.get(serverId);
    if (!server) return;

    this.client.activeServers.remove(serverId);

    await server.hangup();

    const disconnectEmbed = createErrorEmbed(
      `Call disconnected: ${reason}. Please try connecting again.`,
    );

    await Promise.all([
      server.getCallerSideChannel().send({ embeds: [disconnectEmbed] }),
      server.getReceiverSideChannel().send({ embeds: [disconnectEmbed] }),
    ]);
  }

  public getActiveConnections() {
    return this.client.activeServers.getAllActiveChannels();
  }

  public getActiveServers() {
    return this.client.activeServers.getAllServers();
  }
}
