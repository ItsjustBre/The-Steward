import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Check in to The B Continental.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#C6A667')
      .setTitle('🗝️ THE B CONTINENTAL | CHECK-IN')
      .setDescription(
        `Welcome to The B Continental, ${interaction.user}.\n\n` +
        'Your arrival has been acknowledged by The Steward.\n\n' +
        '🏨 **Residence:** The B Continental\n' +
        '🥀 **Community:** The Syndicate\n' +
        '👑 **Management:** Don Bre\n\n' +
        '*Enjoy your stay. The Continental is at your service.*'
      )
      .setFooter({ text: 'THE STEWARD • Guest Services' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
