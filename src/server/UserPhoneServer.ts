import { Message, TextChannel, MessageCollector, User } from "discord.js";
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
  private callerId: string;

  // Cache formatted usernames to avoid repeated string operations
  private readonly userNameCache = new Map<string, string>();
  
  // Spam detection
  private readonly messageHistory = new Map<string, {
    messages: string[],
    timestamps: number[]
  }>();
  private readonly SPAM_WINDOW = 5000; // 5 seconds
  private readonly MAX_MESSAGES = 5; // Max messages in window
  private readonly SIMILARITY_THRESHOLD = 0.8; // 80% similarity threshold

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

  private async isUserBanned(userId: string): Promise<boolean> {
    return await this.client.phonelyService.isUserBanned({
      id: userId,
    } as User);
  }

  private isSpam(userId: string, content: string): boolean {
    const now = Date.now();
    const userHistory = this.messageHistory.get(userId) || {
      messages: [],
      timestamps: []
    };

    // Remove messages outside the spam window
    while (
      userHistory.timestamps.length > 0 && 
      now - userHistory.timestamps[0] > this.SPAM_WINDOW
    ) {
      userHistory.messages.shift();
      userHistory.timestamps.shift();
    }

    // Check message frequency
    if (userHistory.messages.length >= this.MAX_MESSAGES) {
      return true;
    }

    // Check message similarity
    const isSimilar = userHistory.messages.some(msg => {
      const similarity = this.calculateSimilarity(msg, content);
      return similarity > this.SIMILARITY_THRESHOLD;
    });

    if (isSimilar && userHistory.messages.length >= 2) {
      return true;
    }

    // Update history
    userHistory.messages.push(content);
    userHistory.timestamps.push(now);
    this.messageHistory.set(userId, userHistory);

    return false;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxDist = Math.max(len1, len2);
    
    if (maxDist === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxDist;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],
            dp[i][j - 1],
            dp[i - 1][j - 1]
          );
        }
      }
    }

    return dp[m][n];
  }

  async sendMessage(message: Message, side: "caller" | "receiver") {
    // Check if user is banned before sending message
    if (await this.isUserBanned(message.author.id)) {
      message.reply({
        content: "❌ You are banned from using the phone system.",
      });
      return;
    }

    // Check for spam
    if (this.isSpam(message.author.id, message.content)) {
      message.reply({
        content: "⚠️ Your message was not sent because it was detected as spam. Please slow down.",
      });
      return;
    }

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

  async hangup(requesterId?: string) {
    // Only allow the original caller or no requester (system hangup) to disconnect
    if (requesterId && requesterId !== this.callerId) {
      return false;
    }

    // Stop collectors immediately
    this.callerCollector.stop();
    this.receiverCollector.stop();

    // Clear caches
    this.userNameCache.clear();
    this.messageHistory.clear();

    this.emit("hangup");
    return true;
  }

  private initializeCollectors() {
    // Optimized message filter
    const filter = async (message: Message) => {
      return (
        !message.author.bot &&
        message.content[0] !== "." &&
        !(await this.isUserBanned(message.author.id))
      );
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
    this.callerCollector.on("collect", async (msg) => {
      if (await this.isUserBanned(msg.author.id)) {
        msg.reply({
          content: "❌ You are banned from using the phone system.",
        });
        return;
      }

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
    this.receiverCollector.on("collect", async (msg) => {
      if (await this.isUserBanned(msg.author.id)) {
        msg.reply({
          content: "❌ You are banned from using the phone system.",
        });
        return;
      }

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
  getCallerId = (): string => this.callerId;
}
