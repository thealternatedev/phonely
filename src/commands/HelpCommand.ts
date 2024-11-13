import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  InteractionResponse,
} from "discord.js";
import { Command } from "../CommandManager.js";
import { PhonelyClient } from "../Phonely.js";

const COMMANDS_PER_PAGE = 5;
const COLLECTOR_TIMEOUT = 300_000; // 5 minutes
const EMBED_COLOR = 0x2b2d31;

// Memoize help embeds for better performance
const embedCache = new Map<number, EmbedBuilder>();

function generateHelpEmbed(
  commands: Command[],
  page: number = 0,
): EmbedBuilder {
  const cachedEmbed = embedCache.get(page);
  if (cachedEmbed) return cachedEmbed;

  const startIdx = page * COMMANDS_PER_PAGE;
  const totalPages = Math.ceil(commands.length / COMMANDS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle("📞 Phonely - Command List")
    .setDescription(
      "*Browse through all available commands using the buttons below*",
    )
    .addFields(
      commands.slice(startIdx, startIdx + COMMANDS_PER_PAGE).map((cmd) => ({
        name: `${cmd.name}${cmd.aliases?.length ? ` (${cmd.aliases.join(", ")})` : ""}`,
        value: `> ${cmd.data?.description ?? "No description available"}`,
        inline: false,
      })),
    )
    .setFooter({
      text: `Page ${page + 1}/${totalPages} • Made with love by Phonely Team`,
    })
    .setTimestamp();

  embedCache.set(page, embed);
  return embed;
}

const createButtons = (currentPage: number, totalPages: number) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("first")
      .setLabel("⏪ First")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("◀️ Previous")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId("next")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(currentPage === totalPages - 1),
    new ButtonBuilder()
      .setCustomId("last")
      .setLabel("Last ⏩")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === totalPages - 1),
  );

const handlePageChange = (
  action: "first" | "prev" | "next" | "last",
  currentPage: number,
  totalPages: number,
): number => {
  const actions = {
    first: () => 0,
    prev: () => Math.max(0, currentPage - 1),
    next: () => Math.min(totalPages - 1, currentPage + 1),
    last: () => totalPages - 1,
  };
  return actions[action]();
};

const setupCollector = (
  response: Message | InteractionResponse<true>,
  authorId: string,
  commands: Command[],
  initialPage: number,
  totalPages: number,
) => {
  let currentPage = initialPage;

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: COLLECTOR_TIMEOUT,
  });

  collector.on("collect", async (i) => {
    if (i.user.id !== authorId) {
      await i.reply({
        content: "These buttons are not for you!",
        ephemeral: true,
      });
      return;
    }

    currentPage = handlePageChange(
      i.customId as "first" | "prev" | "next" | "last",
      currentPage,
      totalPages,
    );

    await i.update({
      embeds: [generateHelpEmbed(commands, currentPage)],
      components: [createButtons(currentPage, totalPages)],
    });
  });

  collector.on("end", () => {
    response.edit({ components: [] }).catch(() => {});
  });
};

const command: Command = {
  name: "help",
  aliases: ["h", "commands"],
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands and how to use them"),

  async execute(
    client: PhonelyClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ) {
    const commands = Array.from(client.commandManager.getCommands().values());
    const totalPages = Math.ceil(commands.length / COMMANDS_PER_PAGE);

    const response = await interaction.reply({
      embeds: [generateHelpEmbed(commands, 0)],
      components: [createButtons(0, totalPages)],
      ephemeral: true,
    });

    setupCollector(response, interaction.user.id, commands, 0, totalPages);
  },

  async executeMessage(client: PhonelyClient, message: Message) {
    const commands = Array.from(client.commandManager.getCommands().values());
    const totalPages = Math.ceil(commands.length / COMMANDS_PER_PAGE);

    const response = await message.reply({
      embeds: [generateHelpEmbed(commands, 0)],
      components: [createButtons(0, totalPages)],
    });

    setupCollector(response, message.author.id, commands, 0, totalPages);
  },
};

export default command;
