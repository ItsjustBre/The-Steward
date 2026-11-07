
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('View The B Continental operational status.'),

  async execute(interaction) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setColor('#C6A667')
      .setTitle('🏨 THE B CONTINENTAL | OPERATIONS')
      .setDescription(
        'Welcome to the Continental Operations Desk.\n\n' +
        'The Steward is currently attending to hotel operations.'
      )
      .addFields(
        {
          name: '🗝️ The Steward',
          value: '🟢 Online',
          inline: true
        },
        {
          name: '⏱️ System Uptime',
          value: `${hours}h ${minutes}m`,
          inline: true
        },
        {
          name: '🥀 The Syndicate',
          value: 'Community services available through Discord.',
          inline: false
        },
        {
          name: '🎮 Gaming Lounge',
          value: 'Use `/game` to explore gaming activities.',
          inline: false
        },
        {
          name: '🛎️ Concierge Desk',
          value: 'Use `/concierge` for assistance.',
          inline: false
        },
        {
          name: '📜 House Rules',
          value: 'Use `/house-rules` to review Continental etiquette.',
          inline: false
        },
        {
          name: '✉️ Guest Services',
          value: 'Use `/service` to contact management.',
          inline: false
        }
      )
      .setFooter({
        text: 'THE STEWARD • Under the Authority of Don Bre'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};
