import { EmbedBuilder, Colors } from "discord.js";

export const createErrorEmbed = (description: string) => {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle("❌ Error Occurred")
    .setDescription(`> ${description}`)
    .setFooter({ text: "Please try again or contact support if this persists" })
    .setTimestamp();
};

export const createSuccessEmbed = (description: string) => {
  return new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle("✅ Success!")
    .setDescription(`> ${description}`)
    .setFooter({ text: "Operation completed successfully" })
    .setTimestamp();
};
