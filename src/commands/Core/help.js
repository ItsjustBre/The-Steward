import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';

// ==========================================
// THE B CONTINENTAL — GUEST DIRECTORY
// ==========================================

const DIRECTORY = {

  arrival: {
    title: '🏨 THE B CONTINENTAL | Front Desk',
    description:
      'Welcome to The B Continental.\n\n' +
      'Every guest begins their stay at the Front Desk.\n\n' +
      '**`/hotel checkin`** — Announce your arrival.\n' +
      '**`/hotel registry`** — View your guest profile.\n' +
      '**`/hotel status`** — Review your standing within the house.\n\n' +
      '*Welcome to the family. Enjoy your stay.*'
  },

  services: {
    title: '🛎️ THE B CONTINENTAL | Guest Services',
    description:
      'The house is at your service.\n\n' +
      '**`/hotel concierge`** — Receive personalized guidance.\n' +
      '**`/hotel service`** — Submit a private request to Management.\n' +
      '**`/support`** — Access additional assistance.\n\n' +
      '*Discretion is our tradition. Hospitality is our standard.*'
  },

  amenities: {
    title: '🥂 THE B CONTINENTAL | Hotel Amenities',
    description:
      'Explore everything the Continental has to offer.\n\n' +
      '**`/hotel amenities`** — Discover the hotel lounges and amenities.\n' +
      '**`/hotel game`** — Visit the Continental Gaming Lounge.\n\n' +
      'From gaming sessions to beauty and lifestyle discussions, ' +
      'there is a place for every member of The Syndicate.\n\n' +
      '*Make yourself at home.*'
  },

  policies: {
    title: '📜 THE B CONTINENTAL | Continental Protocol',
    description:
      'Every guest is expected to honor the Continental Code.\n\n' +
      '**`/hotel rules`** — Review the house rules and expectations.\n\n' +
      'Respect, discretion, and loyalty are the foundations ' +
      'of our community.\n\n' +
      '*By order of Management.*'
  },

  management: {
    title: '🗝️ THE B CONTINENTAL | Management Office',
    description:
      'Administrative services of The B Continental.\n\n' +
      '**`/configwizard`** — Configure server settings.\n' +
      '**`/commands dashboard`** — Manage available commands.\n' +
      '**`/stats`** — View system intelligence.\n\n' +
      '*Authorized personnel only.*'
  }

};


// ==========================================
// CREATE INITIAL HELP MENU
// ==========================================

export async function createInitialHelpMenu(client) {

  const embed = createEmbed({
    title: '🗝️ THE B CONTINENTAL | GUEST DIRECTORY',
    description:
      'Welcome to The B Continental.\n\n' +
      'A sanctuary for The Syndicate, where every guest ' +
      'is family and discretion is our tradition.\n\n' +
      'The Steward is available to guide you through ' +
      'the services of the house.\n\n' +
      '**Select a department below to explore its services.**',
    color: 'primary',
    thumbnail: client?.user?.displayAvatarURL?.({
      size: 1024
    })
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


// ==========================================
// HELP SLASH COMMAND
// ==========================================

export default {

  slashOnly: true,
  category: 'Core',

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription(
      'Explore The B Continental guest directory'
    ),

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

    // Guest-only interaction collector
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

    // Remove dropdown when the session expires
    collector.on('end', async () => {

      await interaction.editReply({
        components: []
      }).catch(() => {});

    });

  }
};
