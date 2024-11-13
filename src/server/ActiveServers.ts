import { UserPhoneServer } from "./UserPhoneServer";
import { TextChannel } from "discord.js";

/**
 * Manages active phone server connections with efficient storage and retrieval.
 * Uses a plain object without prototype for maximum memory efficiency.
 */
export class ActiveServers {
  /** Map of server IDs to UserPhoneServer instances */
  private servers: Record<string, UserPhoneServer>;

  /**
   * Creates a new ActiveServers instance with an empty servers object.
   * Uses Object.create(null) for a "pure" object with no prototype chain.
   */
  constructor() {
    this.servers = Object.create(null);
  }

  /**
   * Adds a new server to the active servers collection.
   * @param id - Unique identifier for the server
   * @param server - UserPhoneServer instance to add
   */
  public add(id: string, server: UserPhoneServer): void {
    this.servers[id] = server;
  }

  /**
   * Removes a server from the active servers collection.
   * @param id - ID of the server to remove
   */
  public remove(id: string): void {
    delete this.servers[id];
  }

  /**
   * Retrieves a server by its ID.
   * @param id - ID of the server to get
   * @returns The UserPhoneServer instance if found, undefined otherwise
   */
  public get(id: string): UserPhoneServer | undefined {
    return this.servers[id];
  }

  /**
   * Gets an array of all active server IDs.
   * @returns Array of server ID strings
   */
  public getIds(): string[] {
    return Object.keys(this.servers);
  }

  /**
   * Gets the total number of active servers.
   * @returns Number of active servers
   */
  public count(): number {
    return Object.keys(this.servers).length;
  }

  /**
   * Checks if a server ID exists in the collection.
   * @param id - ID to check
   * @returns True if server exists, false otherwise
   */
  public has(id: string): boolean {
    return id in this.servers;
  }

  /**
   * Gets all active server instances.
   * @returns Array of UserPhoneServer instances
   */
  public getAllServers(): UserPhoneServer[] {
    return Object.values(this.servers);
  }

  /**
   * Finds a server by a channel that's part of it.
   * @param channel - Channel to search for
   * @returns Server ID and instance if found, undefined otherwise
   */
  public findByChannel(
    channel: TextChannel,
  ): [string, UserPhoneServer] | undefined {
    const entry = Object.entries(this.servers).find(
      ([_, server]) =>
        server.getCallerSideChannel().id === channel.id ||
        server.getReceiverSideChannel().id === channel.id,
    );
    return entry;
  }

  /**
   * Checks if a channel is part of any active server.
   * @param channel - Channel to check
   * @returns True if channel is in an active call, false otherwise
   */
  public isChannelActive(channel: TextChannel): boolean {
    return this.findByChannel(channel) !== undefined;
  }

  /**
   * Removes all servers from the collection.
   */
  public clear(): void {
    this.servers = Object.create(null);
  }

  /**
   * Gets an array of all channels currently in calls.
   * @returns Array of active TextChannels
   */
  public getAllActiveChannels(): TextChannel[] {
    return this.getAllServers().flatMap((server) => [
      server.getCallerSideChannel(),
      server.getReceiverSideChannel(),
    ]);
  }

  /**
   * Gets the partner channel for a given channel in a call.
   * @param channel - Channel to find partner for
   * @returns Partner TextChannel if found, undefined otherwise
   */
  public getPartnerChannel(channel: TextChannel): TextChannel | undefined {
    const server = this.findByChannel(channel)?.[1];
    if (!server) return undefined;

    return server.getCallerSideChannel().id === channel.id
      ? server.getReceiverSideChannel()
      : server.getCallerSideChannel();
  }
}
