import { User } from "discord.js";
import { DatabaseManager } from "../database/DatabaseManager";

export class PhonelyService {
  private static instance: PhonelyService;
  private databaseManager: DatabaseManager;

  private constructor(databaseManager: DatabaseManager) {
    this.databaseManager = databaseManager;
  }

  public static getInstance(databaseManager: DatabaseManager): PhonelyService {
    return (PhonelyService.instance ??= new PhonelyService(databaseManager));
  }

  /**
   * Bans a user from using the phone system
   * @param user The user to ban
   * @returns True if the user was banned, false if they were already banned
   */
  public async serviceBan(user: User): Promise<boolean> {
    try {
      const bannedUsers =
        (await this.databaseManager.get<string[]>("banned_users")) || [];

      if (bannedUsers.includes(user.id)) {
        return false;
      }

      bannedUsers.push(user.id);
      await this.databaseManager.set("banned_users", bannedUsers);
      return true;
    } catch (error) {
      console.error("Error in serviceBan:", error);
      throw error;
    }
  }

  /**
   * Unbans a user from the phone system
   * @param user The user to unban
   * @returns True if the user was unbanned, false if they weren't banned
   */
  public async serviceUnban(user: User): Promise<boolean> {
    try {
      const bannedUsers =
        (await this.databaseManager.get<string[]>("banned_users")) || [];

      if (!bannedUsers.includes(user.id)) {
        return false;
      }

      const updatedBannedUsers = bannedUsers.filter((id) => id !== user.id);
      await this.databaseManager.set("banned_users", updatedBannedUsers);
      return true;
    } catch (error) {
      console.error("Error in serviceUnban:", error);
      throw error;
    }
  }

  /**
   * Checks if a user is banned from the phone system
   * @param user The user to check
   * @returns True if the user is banned, false otherwise
   */
  public async isUserBanned(user: User): Promise<boolean> {
    try {
      const bannedUsers =
        (await this.databaseManager.get<string[]>("banned_users")) || [];
      return bannedUsers.includes(user.id);
    } catch (error) {
      console.error("Error in isUserBanned:", error);
      throw error;
    }
  }

  /**
   * Gets all banned users
   * @returns Array of banned user IDs
   */
  public async getBannedUsers(): Promise<string[]> {
    try {
      return (await this.databaseManager.get<string[]>("banned_users")) || [];
    } catch (error) {
      console.error("Error in getBannedUsers:", error);
      throw error;
    }
  }
}
