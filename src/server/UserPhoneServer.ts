import { Message, TextChannel, MessageCollector, User } from "discord.js";
import { PhonelyClient } from "../Phonely";
import EventEmitter from "events";

export interface UserPhoneServerEvents {
  messageReceived: (message: Message) => void;
  hangup: () => void;
  ready: () => void;
  linkBlocked: (link: string) => void;
}

// Pre-compile regex for link detection
const LINK_REGEX = /https?:\/\/[^\s]+/g;

// Use Set for O(1) lookups
const TRUSTED_DOMAINS = new Set([
  "youtube.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "twitch.tv",
  "reddit.com",
  "discord.gg",
]);

export class UserPhoneServer extends EventEmitter {
  private callerCollector: MessageCollector;
  private receiverCollector: MessageCollector;
  private callerId: string;

  // Use WeakMap to allow garbage collection
  private userNameCache = new WeakMap<User, string>();

  // Spam detection with optimized data structure
  private readonly messageHistory = new Map<
    string,
    {
      messages: string[];
      timestamps: number[];
    }
  >();

  // Constants as static readonly for better performance
  private static readonly SPAM_WINDOW = 5000;
  private static readonly MAX_MESSAGES = 5;
  private static readonly SIMILARITY_THRESHOLD = 0.8;

  constructor(
    private client: PhonelyClient,
    private callerSideChannel: TextChannel,
    private receiverSideChannel: TextChannel,
    callerUser: User,
  ) {
    super();
    this.callerId = callerUser.id;
    this.initializeCollectors();
  }

  // Optimized event handlers
  on = super.on.bind(this);
  off = super.off.bind(this);
  once = super.once.bind(this);
  emit = super.emit.bind(this);

  private async isUserBanned(userId: string): Promise<boolean> {
    return this.client.phonelyService.isUserBanned({ id: userId } as User);
  }

  private isSpam(userId: string, content: string): boolean {
    const now = Date.now();
    const userHistory = this.messageHistory.get(userId) ?? {
      messages: [],
      timestamps: [],
    };

    // Single-pass array cleanup with index tracking
    let validIdx = 0;
    const cutoff = now - UserPhoneServer.SPAM_WINDOW;

    for (let i = 0; i < userHistory.timestamps.length; i++) {
      if (userHistory.timestamps[i] > cutoff) {
        if (i !== validIdx) {
          userHistory.messages[validIdx] = userHistory.messages[i];
          userHistory.timestamps[validIdx] = userHistory.timestamps[i];
        }
        validIdx++;
      }
    }

    userHistory.messages.length = validIdx;
    userHistory.timestamps.length = validIdx;

    if (userHistory.messages.length >= UserPhoneServer.MAX_MESSAGES)
      return true;

    // Early similarity check
    if (userHistory.messages.length >= 2) {
      for (let i = 0; i < userHistory.messages.length; i++) {
        if (
          this.calculateSimilarity(userHistory.messages[i], content) >
          UserPhoneServer.SIMILARITY_THRESHOLD
        ) {
          return true;
        }
      }
    }

    userHistory.messages.push(content);
    userHistory.timestamps.push(now);
    this.messageHistory.set(userId, userHistory);

    return false;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;

    if (Math.abs(len1 - len2) / Math.max(len1, len2) > 0.5) return 0;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / Math.max(len1, len2);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Use typed arrays for better performance
    const dp = new Uint32Array((m + 1) * (n + 1));
    const width = n + 1;

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i * width] = i;
    for (let j = 0; j <= n; j++) dp[j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i * width + j] =
          str1[i - 1] === str2[j - 1]
            ? dp[(i - 1) * width + (j - 1)]
            : 1 +
              Math.min(
                dp[(i - 1) * width + j],
                dp[i * width + (j - 1)],
                dp[(i - 1) * width + (j - 1)],
              );
      }
    }

    return dp[m * width + n];
  }

  async sendMessage(message: Message, side: "caller" | "receiver") {
    if (await this.isUserBanned(message.author.id)) {
      message.reply({
        content: "❌ You are banned from using the phone system.",
      });
      return;
    }

    if (this.isSpam(message.author.id, message.content)) {
      message.reply({
        content:
          "⚠️ Your message was not sent because it was detected as spam. Please slow down.",
      });
      return;
    }

    const targetChannel =
      side === "caller" ? this.callerSideChannel : this.receiverSideChannel;
    const formattedName =
      this.userNameCache.get(message.author) ??
      `\`${message.author.username}\``;

    this.userNameCache.set(message.author, formattedName);

    targetChannel.send(`${formattedName}: ${message.content}`).catch(() => {});
    this.emit("messageReceived", message);
  }

  async hangup(requesterId?: string): Promise<boolean> {
    if (requesterId && requesterId !== this.callerId) return false;

    this.callerCollector.stop();
    this.receiverCollector.stop();
    this.userNameCache = new WeakMap();
    this.messageHistory.clear();
    this.emit("hangup");
    return true;
  }

  private initializeCollectors() {
    const filter = async (message: Message) =>
      !message.author.bot &&
      message.content[0] !== "." &&
      !(await this.isUserBanned(message.author.id));

    const collectorOptions = { filter, time: 3600000 };

    this.callerCollector =
      this.callerSideChannel.createMessageCollector(collectorOptions);
    this.receiverCollector =
      this.receiverSideChannel.createMessageCollector(collectorOptions);

    const checkLinks = (content: string): string | null => {
      const matches = content.match(LINK_REGEX);
      if (!matches) return null;

      for (const match of matches) {
        const domain = new URL(match).hostname;
        if (!TRUSTED_DOMAINS.has(domain)) return match;
      }
      return null;
    };

    const messageHandler =
      (side: "caller" | "receiver") => async (msg: Message) => {
        if (await this.isUserBanned(msg.author.id)) {
          msg.reply({
            content: "❌ You are banned from using the phone system.",
          });
          return;
        }

        const untrustedLink = checkLinks(msg.content);
        if (untrustedLink) {
          msg.reply({
            content: `⚠️ Your message was not sent because it contains an untrusted link: ${untrustedLink}`,
          });
          this.emit("linkBlocked", untrustedLink);
          return;
        }

        this.sendMessage(msg, side);
      };

    this.callerCollector.on("collect", messageHandler("receiver"));
    this.receiverCollector.on("collect", messageHandler("caller"));
  }

  // Inline getters
  getCallerSideChannel = () => this.callerSideChannel;
  getReceiverSideChannel = () => this.receiverSideChannel;
  getCallerId = () => this.callerId;
}
