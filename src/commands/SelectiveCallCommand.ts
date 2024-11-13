import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  StringSelectMenuInteraction,
  User,
} from "discord.js";
import { Command } from "../CommandManager";
import { PhonelyClient } from "../Phonely";
import { createErrorEmbed, createSuccessEmbed } from "../utils/embeds";

const SELECTION_TIMEOUT = 30000; // 30 seconds to select a channel

const SelectiveCallCommand: Command = {
  name: "selectcall",
  aliases: ["sc", "select"],

  data: new SlashCommandBuilder()
    .setName("selectcall")
    .setDescription(
      "📞 Select a specific channel to call from the available queue",
    ),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            "❌ This command can only be used in text channels!",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    await handleSelectiveCall(
      client,
      interaction.channel,
      interaction.user,
      async (embed, components = []) => {
        if (!interaction.replied) {
          await interaction.reply({ embeds: [embed], components });
        } else {
          await interaction.editReply({ embeds: [embed], components });
        }
      },
      (response) =>
        response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: SELECTION_TIMEOUT,
          filter: (i) => i.user.id === interaction.user.id,
        }),
    );
  },

  async executeMessage(
    client: PhonelyClient,
    message: Message<true>,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;

    await handleSelectiveCall(
      client,
      message.channel,
      message.author,
      async (embed, components = []) => {
        return message.reply({ embeds: [embed], components });
      },
      (response) =>
        response.awaitMessageComponent({
          componentType: ComponentType.StringSelect,
          time: SELECTION_TIMEOUT,
          filter: (i) => i.user.id === message.author.id,
        }),
    );
  },
};

async function handleSelectiveCall(
  client: PhonelyClient,
  channel: TextChannel,
  user: User,
  reply: (
    embed: ReturnType<typeof createErrorEmbed | typeof createSuccessEmbed>,
    components?: any[],
  ) => Promise<any>,
  awaitComponent: (response: any) => Promise<StringSelectMenuInteraction>,
) {
  // Check if user is banned
  if (await client.phonelyService.isUserBanned(user)) {
    await reply(
      createErrorEmbed("🚫 You are banned from using the phone system."),
    );
    return;
  }

  // Get available channels from queue
  const availableChannels = client.channelQueue.values();
  if (availableChannels.length === 0) {
    await reply(
      createErrorEmbed("📭 No channels are currently available to call!"),
    );
    return;
  }

  // Create and handle selection menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("channel_select")
    .setPlaceholder("📞 Select a channel to call")
    .addOptions(
      availableChannels.map((channel) => ({
        label: channel.name,
        description: `📌 #${channel.name} in ${channel.guild.name}`,
        value: channel.id,
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu,
  );

  const response = await reply(
    createSuccessEmbed("📱 Select a channel to call:"),
    [row],
  );

  try {
    const selectInteraction = await awaitComponent(response);

    // Find selected channel in queue values
    const selectedChannel = availableChannels.find(
      (channel) => channel.id === selectInteraction.values[0],
    );

    if (!selectedChannel) {
      await selectInteraction.update({
        embeds: [
          createErrorEmbed("❌ Selected channel is no longer available!"),
        ],
        components: [],
      });
      return;
    }

    await client.userPhoneConnections.selectiveConnect(
      channel,
      selectedChannel,
      async (embed) => {
        await selectInteraction.update({ embeds: [embed], components: [] });
      },
      user,
    );
  } catch (error) {
    await reply(createErrorEmbed("⏰ Channel selection timed out!"), []);
  }
}

export default SelectiveCallCommand;
