import { Client, ClientOptions, Collection, TextChannel } from "discord.js";
import { EventManager } from "./EventManager.js";
import { CommandManager } from "./CommandManager.js";
import { UserPhoneServer } from "./server/UserPhoneServer.js";
import { BotConfiguration } from "./configuration/BotConfiguration.js";
import { UserPhoneConnections } from "./connection/UserPhoneConnections.js";
import { Queue } from "./utils/Queue.js";

export class PhonelyClient extends Client {
  public readonly commandManager: CommandManager;
  public readonly eventManager: EventManager;
  public readonly userPhoneConnections: UserPhoneConnections;

  public config: BotConfiguration;

  public channelQueue: Queue<TextChannel>;
  public connectedServers: Collection<string, UserPhoneServer>;

  constructor(options: ClientOptions) {
    super(options);

    this.commandManager = new CommandManager();
    this.eventManager = new EventManager();
    this.config = new BotConfiguration();
    this.channelQueue = new Queue();
    this.connectedServers = new Collection();
    this.userPhoneConnections = new UserPhoneConnections(this);
  }
}
