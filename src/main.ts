import * as DotEnv from "dotenv";
import { GatewayIntentBits } from "discord.js";
import { PhonelyClient } from "./Phonely";

DotEnv.config();

async function main() {
  const client = new PhonelyClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Load and register events and commands
  await client.eventManager.loadEvents();
  await client.commandManager.loadCommands();

  client.eventManager.putToClient(client);

  // Check if --development flag is present
  const isDevelopment = process.argv.includes("--development");
  const token = isDevelopment
    ? process.env.DiscordDevelopmentToken
    : process.env.DiscordToken;

  if (!token) {
    throw new Error(
      `${isDevelopment ? "DiscordDevelopmentToken" : "DiscordToken"} is not set in environment variables`,
    );
  }

  client.login(token);
}

main();
