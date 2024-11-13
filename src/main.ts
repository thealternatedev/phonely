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

  client.login(process.env.DiscordToken);
}

main();
