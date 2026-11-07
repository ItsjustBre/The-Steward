import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('amenities')
    .setDescription('Explore the lounges of The B Continental'),

  category: 'Hotel',

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xC8A96A)
      .setTitle('🏨 THE B CONTINENTAL | Guest Amenities')
      .setDescription(
        'Welcome to The B Continental.\n\n' +
        'The house offers several exclusive spaces for members of The Syndicate. ' +
        'Allow us to introduce the accommodations.'
      )
      .addFields(
        {
          name: '🎮 The Gaming Lounge',
          value: 'For gamers, stream watchers, and friendly competition. Pull up a chair; the house always has room for another player.'
        },
        {
          name: '💄 The Beauty Suite',
          value: 'Makeup, skincare, hair, fashion, and everything glamorous. Excellence is always in style.'
        },
        {
          name: '🥂 The Lifestyle Salon',
          value: 'Everyday conversations, personal victories, recommendations, and the finer details of life.'
        },
        {
          name: '🗝️ Guest Assistance',
          value: 'Need assistance? Our staff is available through `/service`.'
        }
      )
      .setFooter({
        text: 'The B Continental • By Order of Management'
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
