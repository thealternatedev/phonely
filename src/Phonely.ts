import { Client, ClientOptions, TextChannel } from "discord.js";
import { EventManager } from "./EventManager";
import { CommandManager } from "./CommandManager";
import { BotConfiguration } from "./configuration/BotConfiguration";
import { UserPhoneConnections } from "./connection/UserPhoneConnections";
import { Queue } from "./utils/Queue";
import { ActiveServers } from "./server/ActiveServers";
import { DatabaseManager } from "./database/DatabaseManager";
import { PhonelyService } from "./service/PhonelyService";

export class PhonelyClient extends Client {
  public readonly commandManager: CommandManager;
  public readonly eventManager: EventManager;
  public readonly userPhoneConnections: UserPhoneConnections;
  public readonly activeServers: ActiveServers;
  public readonly databaseManager: DatabaseManager;
  public readonly phonelyService: PhonelyService;
  public statusUpdateIntervals: Map<string, NodeJS.Timeout>;
  public isDevelopment: boolean;

  public config: BotConfiguration;

  public channelQueue: Queue<TextChannel>;

  constructor(options: ClientOptions) {
    super(options);

    this.config = new BotConfiguration();
    this.databaseManager = new DatabaseManager(this);
    this.commandManager = new CommandManager();
    this.eventManager = new EventManager();
    this.channelQueue = new Queue();
    this.activeServers = new ActiveServers();
    this.userPhoneConnections = new UserPhoneConnections(this);
    this.phonelyService = PhonelyService.getInstance(this.databaseManager);
    this.statusUpdateIntervals = new Map();
    this.isDevelopment = process.argv.includes("--development");
  }
}
