import { Message, TextChannel, MessageCollector } from "discord.js";
import { PhonelyClient } from "../Phonely";
import EventEmitter from "events";

export interface UserPhoneServerEvents {
  messageReceived: (message: Message) => void;
  hangup: () => void;
  ready: () => void;
  linkBlocked: (link: string) => void;
}

const trustedLinks: string[] = [
  "youtube.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "twitch.tv",
  "reddit.com",
  "discord.gg",
];

export class UserPhoneServer extends EventEmitter {
  private callerCollector: MessageCollector;
  private receiverCollector: MessageCollector;

  // Cache formatted usernames to avoid repeated string operations
  private readonly userNameCache = new Map<string, string>();

  constructor(
    private client: PhonelyClient,
    private callerSideChannel: TextChannel,
    private receiverSideChannel: TextChannel,
  ) {
    super();

    this.initializeCollectors();
  }

  on(
    event: keyof UserPhoneServerEvents,
    listener: (...args: any[]) => void,
  ): this {
    return super.on(event, listener);
  }

  off(
    event: keyof UserPhoneServerEvents,
    listener: (...args: any[]) => void,
  ): this {
    return super.off(event, listener);
  }

  once(
    event: keyof UserPhoneServerEvents,
    listener: (...args: any[]) => void,
  ): this {
    return super.once(event, listener);
  }

  emit(event: keyof UserPhoneServerEvents, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  async sendMessage(message: Message, side: "caller" | "receiver") {
    const targetChannel =
      side === "caller" ? this.callerSideChannel : this.receiverSideChannel;

    // Get cached username or format and cache it
    let formattedName = this.userNameCache.get(message.author.id);
    if (!formattedName) {
      formattedName = `\`${message.author.username}\``;
      this.userNameCache.set(message.author.id, formattedName);
    }

    // Use template literal for faster string concatenation
    const formattedMessage = `${formattedName}: ${message.content}`;

    // Fire and forget message sending to avoid waiting
    targetChannel.send(formattedMessage).catch(() => {});
    this.emit("messageReceived", message);
  }

  async hangup() {
    // Stop collectors immediately
    this.callerCollector.stop();
    this.receiverCollector.stop();

    // Clear cache
    this.userNameCache.clear();

    this.emit("hangup");
  }

  private initializeCollectors() {
    // Optimized message filter
    const filter = (message: Message) => {
      return !message.author.bot && message.content[0] !== ".";
    };

    // Shared collector options
    const collectorOptions = { filter, time: 3600000 }; // 1 hour timeout

    // Initialize collectors
    this.callerCollector =
      this.callerSideChannel.createMessageCollector(collectorOptions);
    this.receiverCollector =
      this.receiverSideChannel.createMessageCollector(collectorOptions);

    // Helper function to check for untrusted links
    const hasUntrustedLink = (content: string) => {
      const words = content.split(" ");
      for (const word of words) {
        if (word.startsWith("http://") || word.startsWith("https://")) {
          const isUntrusted = !trustedLinks.some((trusted) =>
            word.includes(trusted),
          );
          if (isUntrusted) return word;
        }
      }
      return null;
    };

    // Bind message handlers
    this.callerCollector.on("collect", (msg) => {
      const untrustedLink = hasUntrustedLink(msg.content);
      if (untrustedLink) {
        msg.reply({
          content: `⚠️ Your message was not sent because it contains an untrusted link: ${untrustedLink}`,
        });
        this.emit("linkBlocked", untrustedLink);
        return;
      }
      this.sendMessage(msg, "receiver");
    });
    this.receiverCollector.on("collect", (msg) => {
      const untrustedLink = hasUntrustedLink(msg.content);
      if (untrustedLink) {
        msg.reply({
          content: `⚠️ Your message was not sent because it contains an untrusted link: ${untrustedLink}`,
        });
        this.emit("linkBlocked", untrustedLink);
        return;
      }
      this.sendMessage(msg, "caller");
    });
  }

  // Inline getters for better performance
  getCallerSideChannel = (): TextChannel => this.callerSideChannel;
  getReceiverSideChannel = (): TextChannel => this.receiverSideChannel;
}
