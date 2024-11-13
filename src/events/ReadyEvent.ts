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
      clc.yellow("🌟 ═══════════════════════════════════════════════ 🌟"),
    );
    console.log(clc.cyan("                📞 PHONELY BOT"));
    console.log(
      clc.yellow("═══════════════════════════════════════════════════"),
    );
    console.log("");
    console.log(clc.blue(`➜ 🤖 Bot User    : ${client.user?.tag}`));
    console.log(clc.blue(`➜ 🌐 Servers     : ${client.guilds.cache.size}`));
    console.log(clc.green(`➜ 🟢 Status      : Online`));
    console.log(clc.blue(`➜ ⏰ Started At  : ${new Date().toLocaleString()}`));
    console.log("");
    console.log(
      clc.yellow("═══════════════════════════════════════════════════"),
    );
    console.log(clc.cyan("            Ready to make connections!"));
    console.log(
      clc.yellow("🌟 ═══════════════════════════════════════════════ 🌟"),
    );
    console.log("\n");

    // Set up rotating presence
    let presenceIndex = 0;
    const presences = [
      { type: ActivityType.Playing, message: "with phone lines 📞" },
      {
        type: ActivityType.Watching,
        message: `${client.guilds.cache.size} servers chat`,
      },
      { type: ActivityType.Listening, message: "to cross-channel calls 🔊" },
      { type: ActivityType.Playing, message: ".help for commands ✨" },
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
