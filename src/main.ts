import * as DotEnv from "dotenv";
import { GatewayIntentBits } from "discord.js";
import { PhonelyClient } from "./Phonely";

// Load env variables synchronously at startup for better performance
DotEnv.config();

// Cache command line args check
const isDevelopment = process.argv.includes("--development");
const envToken = isDevelopment ? process.env.DiscordDevelopmentToken : process.env.DiscordToken;

if (!envToken) {
  throw new Error(
    `${isDevelopment ? "DiscordDevelopmentToken" : "DiscordToken"} is not set in environment variables`
  );
}

// Initialize client with all required intents upfront
const client = new PhonelyClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
  ],
});

// Self-executing async function for better performance
(async () => {
  // Load events and commands in parallel
  await Promise.all([
    client.eventManager.loadEvents(),
    client.commandManager.loadCommands()
  ]);

  client.eventManager.putToClient(client);
  
  // Login with cached token
  await client.login(envToken);
})().catch(console.error);
