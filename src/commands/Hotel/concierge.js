
import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('concierge')
    .setDescription('Your personal guide to The B Continental')
    .addStringOption(option =>
      option
        .setName('assistance')
        .setDescription('How may The Concierge assist you?')
        .setRequired(true)
        .addChoices(
          { name: '🏨 Hotel Directory', value: 'directory' },
          { name: '🎮 Gaming Lounge', value: 'gaming' },
          { name: '💄 Beauty Suite', value: 'beauty' },
          { name: '🥂 Lifestyle Salon', value: 'lifestyle' },
          { name: '🗝️ Guest Services', value: 'services' }
        )
    ),

  category: 'Hotel',

  async execute(interaction) {
    const choice = interaction.options.getString('assistance');

    const responses = {
      directory: {
        title: '🏨 The Continental | Hotel Directory',
        description:
          'Welcome, esteemed guest. The Concierge is delighted to assist you.\n\n' +
          '🎮 **Gaming Lounge** — Games, streams, and friendly competition.\n' +
          '💄 **Beauty Suite** — Makeup, fashion, skincare, and glamour.\n' +
          '🥂 **Lifestyle Salon** — Conversations, recommendations, and everyday life.\n' +
          '🗝️ **Guest Services** — Private assistance from Management.'
      },
      gaming: {
        title: '🎮 The Continental | Gaming Lounge',
        description:
          'Looking for adventure? An excellent choice.\n\n' +
          'Join fellow members of The Syndicate for gaming conversations, streams, and community activities.\n\n' +
          'Every player has a seat at our table.'
      },
      beauty: {
        title: '💄 The Continental | Beauty Suite',
        description:
          'A guest with impeccable taste, I see.\n\n' +
          'Explore makeup, skincare, fashion, beauty inspiration, and everything glamorous.\n\n' +
          'Excellence is always in style.'
      },
      lifestyle: {
        title: '🥂 The Continental | Lifestyle Salon',
        description:
          'Please, make yourself comfortable.\n\n' +
          'Share your experiences, personal victories, recommendations, and everyday conversations.\n\n' +
          'At The Continental, good company is always welcome.'
      },
      services: {
        title: '🗝️ The Continental | Guest Services',
        description:
          'Of course. Discretion is our specialty.\n\n' +
          'For private assistance, please use `/hotel service` to contact Management.\n\n' +
          'Your request will be delivered to the Service Desk.'
      }
    };

    const response = responses[choice];

    const embed = new EmbedBuilder()
      .setColor(0xC8A96A)
      .setTitle(response.title)
      .setDescription(response.description)
      .setFooter({
        text: 'The B Continental • At Your Service'
      });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
};
