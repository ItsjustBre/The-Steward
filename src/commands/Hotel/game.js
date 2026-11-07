import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('game')
    .setDescription('Visit The B Continental Gaming Lounge'),

  category: 'Hotel',

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0xC8A96A)
      .setTitle('🎮 THE B CONTINENTAL | Gaming Lounge')
      .setDescription(
        'Welcome to the Continental Gaming Lounge.\n\n' +
        'Where The Syndicate comes together to play, compete, and unwind.\n\n' +
        '*Every player has a seat at our table.*'
      )
      .addFields(
        {
          name: '🎮 Gaming Sessions',
          value: 'Find fellow members and organize multiplayer adventures.'
        },
        {
          name: '🏆 Continental Tournaments',
          value: 'Community competitions, challenges, and special events.'
        },
        {
          name: '🥀 Syndicate Game Nights',
          value: 'Join Don Bre and the family for community gaming sessions.'
        },
        {
          name: '👑 Capo VIP Experiences',
          value: 'Special gaming opportunities and subscriber perks.'
        },
        {
          name: '🗝️ House Etiquette',
          value: 'Competition is encouraged. Respect is required.'
        }
      )
      .setFooter({
        text: 'The B Continental • Gaming Lounge'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};



Commit and test
