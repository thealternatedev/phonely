import { EmbedBuilder } from "discord.js";

export const createErrorEmbed = (description: string) => {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("❌ Error")
    .setDescription(description)
    .setTimestamp();
};

export const createSuccessEmbed = (description: string) => {
  return new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("🎉 Success")
    .setDescription(description)
    .setTimestamp();
};
