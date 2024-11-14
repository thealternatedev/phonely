import { UserPhoneServer } from "./UserPhoneServer";
import { TextChannel } from "discord.js";

/**
 * Manages active phone server connections with zero overhead data structures.
 * Uses Map for O(1) operations and minimal memory footprint.
 */
export class ActiveServers {
  /** Primary Map for server storage with O(1) access */
  private servers: Map<string, UserPhoneServer>;

  /** Secondary index for fast channel lookups */
  private channelIndex: Map<string, [string, UserPhoneServer]>;

  constructor() {
    this.servers = new Map();
    this.channelIndex = new Map();
  }

  public add(id: string, server: UserPhoneServer): void {
    this.servers.set(id, server);
    // Index both channels for O(1) lookup
    const callerChannel = server.getCallerSideChannel();
    const receiverChannel = server.getReceiverSideChannel();
    this.channelIndex.set(callerChannel.id, [id, server]);
    this.channelIndex.set(receiverChannel.id, [id, server]);
  }

  public remove(id: string): void {
    const server = this.servers.get(id);
    if (server) {
      // Clean up channel index
      this.channelIndex.delete(server.getCallerSideChannel().id);
      this.channelIndex.delete(server.getReceiverSideChannel().id);
      this.servers.delete(id);
    }
  }

  public get(id: string): UserPhoneServer | undefined {
    return this.servers.get(id);
  }

  public getIds(): string[] {
    return Array.from(this.servers.keys());
  }

  public count(): number {
    return this.servers.size;
  }

  public has(id: string): boolean {
    return this.servers.has(id);
  }

  public hasChannel(channelId: string): boolean {
    return this.channelIndex.has(channelId);
  }

  public getAllServers(): UserPhoneServer[] {
    return Array.from(this.servers.values());
  }

  public findByChannel(
    channel: TextChannel,
  ): [string, UserPhoneServer] | undefined {
    return this.channelIndex.get(channel.id);
  }

  public isChannelActive(channel: TextChannel): boolean {
    return this.channelIndex.has(channel.id);
  }

  public clear(): void {
    this.servers.clear();
    this.channelIndex.clear();
  }

  public getAllActiveChannels(): TextChannel[] {
    const channels: TextChannel[] = [];
    for (const server of this.servers.values()) {
      channels.push(
        server.getCallerSideChannel(),
        server.getReceiverSideChannel(),
      );
    }
    return channels;
  }

  public getPartnerChannel(channel: TextChannel): TextChannel | undefined {
    const serverEntry = this.channelIndex.get(channel.id);
    if (!serverEntry) return undefined;

    const server = serverEntry[1];
    return server.getCallerSideChannel().id === channel.id
      ? server.getReceiverSideChannel()
      : server.getCallerSideChannel();
  }

  public getServerByChannel(channelId: string): UserPhoneServer | undefined {
    const entry = this.channelIndex.get(channelId);
    return entry ? entry[1] : undefined;
  }

  public removeByChannel(channelId: string): void {
    const entry = this.channelIndex.get(channelId);
    if (entry) {
      this.remove(entry[0]);
    }
  }
}
