import { Collection, TextChannel } from "discord.js";
import { PhonelyClient } from "../Phonely.js";
import { UserPhoneServer } from "../server/UserPhoneServer.js";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds.js";

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
  ) {
    // Check if channel is already connected or in queue
    const isInQueue = this.client.channelQueue.values().includes(channel);
    const isConnected = [...this.client.connectedServers.values()].some(
      (server) =>
        server.getCallerSideChannel().id === channel.id ||
        server.getReceiverSideChannel().id === channel.id,
    );

    if (isInQueue)
      return reply(createErrorEmbed("This channel is already in the queue!"));
    if (isConnected)
      return reply(createErrorEmbed("This channel is already in a call!"));

    // If queue is empty, add to queue and wait
    if (this.client.channelQueue.size() === 0) {
      this.client.channelQueue.enqueue(channel);
      await reply(
        createSuccessEmbed("Waiting for another channel to connect..."),
      );
      return;
    }

    // Get and remove first channel from queue
    const queuedChannel = this.client.channelQueue.dequeue();
    if (!queuedChannel) return;

    await this.createConnection(queuedChannel, channel, reply);
  }

  public async selectiveConnect(
    channel: TextChannel,
    targetChannel: TextChannel,
    reply: (
      embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    ) => Promise<void>,
  ) {
    // Check if either channel is already connected
    const isEitherConnected = [...this.client.connectedServers.values()].some(
      (server) =>
        server.getCallerSideChannel().id === channel.id ||
        server.getReceiverSideChannel().id === channel.id ||
        server.getCallerSideChannel().id === targetChannel.id ||
        server.getReceiverSideChannel().id === targetChannel.id,
    );

    if (isEitherConnected)
      return reply(
        createErrorEmbed("One or both channels are already in a call!"),
      );

    await this.createConnection(channel, targetChannel, reply);
  }

  public async tempConnect(
    channel: TextChannel,
    duration: number,
    reply: (
      embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    ) => Promise<void>,
  ) {
    // Similar to connect but with custom duration
    const isInQueue = this.client.channelQueue.values().includes(channel);
    const isConnected = [...this.client.connectedServers.values()].some(
      (server) =>
        server.getCallerSideChannel().id === channel.id ||
        server.getReceiverSideChannel().id === channel.id,
    );

    if (isInQueue)
      return reply(createErrorEmbed("This channel is already in the queue!"));
    if (isConnected)
      return reply(createErrorEmbed("This channel is already in a call!"));

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

    await this.createConnection(queuedChannel, channel, reply, duration);
  }

  private async createConnection(
    channelOne: TextChannel,
    channelTwo: TextChannel,
    reply: (
      embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    ) => Promise<void>,
    duration: number = 60000,
  ) {
    const serverId =
      Date.now().toString(36) + Math.random().toString(36).substring(2);
    const phoneServer = new UserPhoneServer(
      this.client,
      channelOne,
      channelTwo,
    );
    this.client.connectedServers.set(serverId, phoneServer);

    const successEmbed = createSuccessEmbed(
      `Connected to a channel! You can now chat for ${duration / 1000} seconds before traffic disconnects the call.`,
    );

    await Promise.all([
      channelOne.send({ embeds: [successEmbed] }),
      reply(successEmbed),
    ]);

    setTimeout(async () => {
      await this.disconnect(serverId);
    }, duration);
  }

  public async disconnect(serverId: string) {
    const server = this.client.connectedServers.get(serverId);
    if (!server) return;

    this.client.connectedServers.delete(serverId);

    await server.hangup();

    const disconnectEmbed = createErrorEmbed(
      "Call disconnected due to network traffic. Please try connecting again.",
    );

    await Promise.all([
      server.getCallerSideChannel().send({ embeds: [disconnectEmbed] }),
      server.getReceiverSideChannel().send({ embeds: [disconnectEmbed] }),
    ]);
  }
}
