import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';

const DIRECTORY = {
  arrival: {
    title: '🏨 The Front Desk',
    description:
      '**`/checkin`** — Begin your stay at The B Continental.\n' +
      '**`/hotel`** — Explore the Continental.\n' +
      '**`/registry`** — Access the guest registry.'
  },
  services: {
    title: '🛎️ Guest Services',
    description:
      '**`/service`** — Submit a guest service request.\n' +
      '**`/concierge`** — Contact the Concierge.\n' +
      '**`/support`** — Guest assistance.'
  },
  amenities: {
    title: '🥂 Hotel Amenities',
    description:
      '**`/amenities`** — Explore the hotel amenities.\n' +
      '**`/game`** — Gaming services and activities.'
  },
  policies: {
    title: '📜 Continental Protocol',
    description:
      '**`/house-rules`** — Review hotel policies.'
  },
  management: {
    title: '🗝️ Management Office',
    description:
      '**`/configwizard`** — Configure server settings.\n' +
      '**`/commands dashboard`** — Manage commands.\n' +
      '**`/stats`** — System intelligence.'
  }
};

export async function createInitialHelpMenu(client) {
  const embed = createEmbed({
    title: '🗝️ THE B CONTINENTAL | GUEST DIRECTORY',
    description:
      'Welcome to The B Continental.\n\n' +
      'A sanctuary for The Syndicate, where every guest ' +
      'is family and discretion is our tradition.\n\n' +
      'Select a department below to explore its services.',
    color: 'primary',
    thumbnail: client?.user?.displayAvatarURL?.({ size: 1024 })
  });

  embed.setFooter({
    text: 'THE B CONTINENTAL • By Order of Don Bre'
  });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('continental-directory')
    .setPlaceholder('🗝️ Choose a department')
    .addOptions([
      {
        label: 'The Front Desk',
        value: 'arrival',
        emoji: '🏨'
      },
      {
        label: 'Guest Services',
        value: 'services',
        emoji: '🛎️'
      },
      {
        label: 'Hotel Amenities',
        value: 'amenities',
        emoji: '🥂'
      },
      {
        label: 'Continental Protocol',
        value: 'policies',
        emoji: '📜'
      },
      {
        label: 'Management Office',
        value: 'management',
        emoji: '🗝️'
      }
    ]);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menu)
    ]
  };
}

export default {
  slashOnly: true,
  category: 'Core',

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Explore The B Continental guest directory'),

  async execute(interaction) {
    const { embeds, components } =
      await createInitialHelpMenu(interaction.client);

    const response = await interaction.reply({
      embeds,
      components,
      flags: MessageFlags.Ephemeral,
      withResponse: true
    });

    const message = response.resource?.message;

    if (!message) return;

    const collector = message.createMessageComponentCollector({
      filter: i =>
        i.customId === 'continental-directory' &&
        i.user.id === interaction.user.id,
      time: 300000
    });

    collector.on('collect', async i => {
      const department = DIRECTORY[i.values[0]];
      if (!department) return;

      const embed = createEmbed({
        title: department.title,
        description: department.description,
        color: 'primary'
      });

      embed.setFooter({
        text: 'THE B CONTINENTAL • Guest Directory'
      });

      await i.update({
        embeds: [embed],
        components
      });
    });

    collector.on('end', async () => {
      await interaction.editReply({
        components: []
      }).catch(() => {});
    });
  }
};
