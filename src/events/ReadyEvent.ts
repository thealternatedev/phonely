import { ActivityType } from "discord.js";
import { Event } from "../EventManager";
import { PhonelyClient } from "../Phonely";
import { CustomInterface } from "../readline/CustomInterface";
import clc from "cli-color";

const event: Event<"ready"> = {
  name: "ready", 
  once: true,
  execute: async (client: PhonelyClient) => {
    // Load commands first for faster startup
    await client.commandManager.loadRestCommands(client);

    // Pre-calculate values used multiple times
    const guildSize = client.guilds.cache.size;
    const memoryUsage = `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`;
    const userTag = client.user?.tag;
    const startTime = new Date().toLocaleString();

    // Prepare presence data
    const presences = [
      { type: ActivityType.Playing, message: "📞 Connecting Discord Worlds 🌍" },
      { type: ActivityType.Watching, message: `${guildSize} Servers Connect 🔌` },
      { type: ActivityType.Listening, message: "Cross-Server Conversations 🗣️" },
      { type: ActivityType.Playing, message: "Try /help to Get Started ⭐" },
      { type: ActivityType.Playing, message: "Phone Roulette 🎲" },
      { type: ActivityType.Watching, message: "Channels Connect 🔄" },
      { type: ActivityType.Listening, message: "Conference Calls 👥" },
      { type: ActivityType.Playing, message: "Making New Friends 🤝" },
      { type: ActivityType.Watching, message: "Messages Flow 📨" }
    ];

    // Set initial presence immediately
    client.user?.setPresence({
      activities: [{ name: presences[0].message, type: presences[0].type }],
      status: "online"
    });

    // Batch console outputs to reduce I/O operations
    const output = [
      "\n",
      clc.yellow("✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦"),
      clc.cyan("                      📞 PHONELY BOT                        "),
      clc.yellow("✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦"),
      "",
      clc.blue("  🤖 Bot User      : ") + clc.white(userTag),
      clc.blue("  🌐 Servers       : ") + clc.white(guildSize),
      clc.blue("  ⚡ Status        : ") + clc.green("Online"),
      clc.blue("  ⏰ Started At    : ") + clc.white(startTime),
      clc.blue("  📦 Version       : ") + clc.white("v1.0.0"),
      clc.blue("  🔧 Node.js       : ") + clc.white(process.version),
      clc.blue("  💾 Memory Usage  : ") + clc.white(memoryUsage),
      "",
      clc.magenta("  ✨ Features:"),
      clc.cyan("     🎲 Random Channel Roulette"),
      clc.cyan("     🎯 Direct Channel Connections"),
      clc.cyan("     ⏱️ Timed Speed Calls"),
      clc.cyan("     👥 Multi-Channel Conferences"),
      clc.cyan("     📊 Live Status Updates"),
      "",
      clc.yellow("* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *"),
      clc.green("              ✨ Ready to make connections! ✨              "),
      clc.yellow("* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *"),
      "\n"
    ].join("\n");

    console.clear();
    console.log(output);

    // Use a more efficient presence rotation with a single interval
    let presenceIndex = 0;
    setInterval(() => {
      presenceIndex = (presenceIndex + 1) % presences.length;
      client.user?.setPresence({
        activities: [{ 
          name: presences[presenceIndex].message,
          type: presences[presenceIndex].type
        }],
        status: "online"
      });
    }, 15000);

    new CustomInterface(client);
  },
};

export default event;
