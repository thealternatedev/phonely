import { ActivityType } from "discord.js";
import { Event } from "../EventManager";
import { PhonelyClient } from "../Phonely";
import { CustomInterface } from "../readline/CustomInterface";
import clc from "cli-color";

const event: Event<"ready"> = {
  name: "ready",
  once: true,
  execute: async (client: PhonelyClient) => {
    await client.commandManager.loadRestCommands(client.user?.id!);

    console.clear();
    console.log("\n");
    console.log(
      clc.yellow(
        "✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦",
      ),
    );
    console.log(
      clc.cyan("                      📞 PHONELY BOT                        "),
    );
    console.log(
      clc.yellow(
        "✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦ ⋆ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ┈ ⋆ ✦",
      ),
    );
    console.log("");
    console.log(
      clc.blue("  🤖 Bot User      : ") + clc.white(client.user?.tag),
    );
    console.log(
      clc.blue("  🌐 Servers       : ") + clc.white(client.guilds.cache.size),
    );
    console.log(clc.blue("  ⚡ Status        : ") + clc.green("Online"));
    console.log(
      clc.blue("  ⏰ Started At    : ") +
        clc.white(new Date().toLocaleString()),
    );
    console.log(clc.blue("  📦 Version       : ") + clc.white("v1.0.0"));
    console.log(clc.blue("  🔧 Node.js       : ") + clc.white(process.version));
    console.log(
      clc.blue("  💾 Memory Usage  : ") +
        clc.white(
          `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        ),
    );
    console.log("");
    console.log(clc.magenta("  ✨ Features:"));
    console.log(clc.cyan("     🎲 Random Channel Roulette"));
    console.log(clc.cyan("     🎯 Direct Channel Connections"));
    console.log(clc.cyan("     ⏱️ Timed Speed Calls"));
    console.log(clc.cyan("     👥 Multi-Channel Conferences"));
    console.log(clc.cyan("     📊 Live Status Updates"));
    console.log("");
    console.log(
      clc.yellow(
        "* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *",
      ),
    );
    console.log(
      clc.green("              ✨ Ready to make connections! ✨              "),
    );
    console.log(
      clc.yellow(
        "* ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ ・ *",
      ),
    );
    console.log("\n");

    // Set up rotating presence
    let presenceIndex = 0;
    const presences = [
      {
        type: ActivityType.Playing,
        message: "📞 Connecting Discord Worlds 🌍",
      },
      {
        type: ActivityType.Watching,
        message: `${client.guilds.cache.size} Servers Connect 🔌`,
      },
      {
        type: ActivityType.Listening,
        message: "Cross-Server Conversations 🗣️",
      },
      { type: ActivityType.Playing, message: "Try /help to Get Started ⭐" },
      { type: ActivityType.Playing, message: "Phone Roulette 🎲" },
      { type: ActivityType.Watching, message: "Channels Connect 🔄" },
      { type: ActivityType.Playing, message: "Speed Dating Mode ⚡" },
      { type: ActivityType.Listening, message: "Conference Calls 👥" },
      { type: ActivityType.Playing, message: "Making New Friends 🤝" },
      { type: ActivityType.Watching, message: "Messages Flow 📨" },
    ];

    // Update presence immediately
    client.user?.setPresence({
      activities: [{ name: presences[0].message, type: presences[0].type }],
      status: "online",
    });

    // Rotate presence every 15 seconds
    setInterval(() => {
      presenceIndex = (presenceIndex + 1) % presences.length;
      client.user?.setPresence({
        activities: [
          {
            name: presences[presenceIndex].message,
            type: presences[presenceIndex].type,
          },
        ],
        status: "online",
      });
    }, 15000);

    new CustomInterface(client);
  },
};

export default event;
