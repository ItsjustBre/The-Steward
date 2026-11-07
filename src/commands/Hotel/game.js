import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('game')
    .setDescription('Visit The B Continental Gaming Lounge.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#C6A667')
      .setTitle('🎮 THE B CONTINENTAL | GAMING LOUNGE')
      .setDescription(
        'Welcome to the Gaming Lounge.\n\n' +
        'A place where The Syndicate gathers to play, compete, and unwind.\n\n' +
        '🎮 **Gaming Sessions**\n' +
        'Find fellow members and organize multiplayer sessions.\n\n' +
        '🏆 **Continental Tournaments**\n' +
        'Compete in community challenges and special events.\n\n' +
        '🥀 **Syndicate Game Nights**\n' +
        'Join Don Bre and the family for community gaming.\n\n' +
        '👑 **Capo VIP Sessions**\n' +
        'Exclusive gaming experiences for eligible Capos.\n\n' +
        '🗝️ **House Etiquette**\n' +
        'Respect your fellow players. Competition is welcome; hostility is not.\n\n' +
        '*Your next adventure begins here.*'
      )
      .setFooter({
        text: 'THE STEWARD • Gaming Lounge'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};
