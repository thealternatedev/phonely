import {
  Message,
  TextChannel,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  StringSelectMenuInteraction,
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
      "Select a specific channel to call from the available queue",
    ),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        embeds: [
          createErrorEmbed("This command can only be used in text channels!"),
        ],
        ephemeral: true,
      });
      return;
    }

    // Get available channels from queue
    const availableChannels = client.channelQueue.values();
    if (availableChannels.length === 0) {
      await interaction.reply({
        embeds: [
          createErrorEmbed("No channels are currently available to call!"),
        ],
      });
      return;
    }

    // Create and handle selection menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("channel_select")
      .setPlaceholder("Select a channel to call")
      .addOptions(
        availableChannels.map((channel) => ({
          label: channel.name,
          description: `#${channel.name} in ${channel.guild.name}`,
          value: channel.id,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );
    const response = await interaction.reply({
      embeds: [createSuccessEmbed("Select a channel to call:")],
      components: [row],
    });

    try {
      const selectInteraction = (await response.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: SELECTION_TIMEOUT,
      })) as StringSelectMenuInteraction;

      // Find selected channel in queue values
      const selectedChannel = availableChannels.find(
        (channel) => channel.id === selectInteraction.values[0],
      );

      if (!selectedChannel) {
        await selectInteraction.update({
          embeds: [
            createErrorEmbed("Selected channel is no longer available!"),
          ],
          components: [],
        });
        return;
      }

      await client.userPhoneConnections.selectiveConnect(
        interaction.channel,
        selectedChannel,
        async (embed) => {
          await selectInteraction.update({ embeds: [embed], components: [] });
        },
      );
    } catch (error) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Channel selection timed out!")],
        components: [],
      });
    }
  },

  async executeMessage(
    client: PhonelyClient,
    message: Message<true>,
    args: string[],
  ) {
    if (!(message.channel instanceof TextChannel)) return;

    // Get available channels from queue
    const availableChannels = client.channelQueue.values();
    if (availableChannels.length === 0) {
      await message.reply({
        embeds: [
          createErrorEmbed("No channels are currently available to call!"),
        ],
      });
      return;
    }

    // Create and handle selection menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("channel_select")
      .setPlaceholder("Select a channel to call")
      .addOptions(
        availableChannels.map((channel) => ({
          label: channel.name,
          description: `#${channel.name} in ${channel.guild.name}`,
          value: channel.id,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );
    const response = await message.reply({
      embeds: [createSuccessEmbed("Select a channel to call:")],
      components: [row],
    });

    try {
      const selectInteraction = (await response.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: SELECTION_TIMEOUT,
      })) as StringSelectMenuInteraction;

      // Find selected channel in queue values
      const selectedChannel = availableChannels.find(
        (channel) => channel.id === selectInteraction.values[0],
      );

      if (!selectedChannel) {
        await selectInteraction.update({
          embeds: [
            createErrorEmbed("Selected channel is no longer available!"),
          ],
          components: [],
        });
        return;
      }

      await client.userPhoneConnections.selectiveConnect(
        message.channel,
        selectedChannel,
        async (embed) => {
          await selectInteraction.update({ embeds: [embed], components: [] });
        },
      );
    } catch (error) {
      await message.edit({
        embeds: [createErrorEmbed("Channel selection timed out!")],
        components: [],
      });
    }
  },
};

export default SelectiveCallCommand;
