import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check The B Continental operations desk'),

  category: 'Hotel',

  async execute(interaction) {
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setColor(0xC8A96A)
      .setTitle('🏨 THE B CONTINENTAL | Operations Desk')
      .setDescription(
        'Welcome to the Continental Operations Desk.\n\n' +
        'The Steward is on duty and ready to assist.'
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
          value: 'Welcome to the family.',
          inline: false
        },
        {
          name: '🎮 Gaming Lounge',
          value: 'Use `/game` to explore gaming activities.',
          inline: false
        },
        {
          name: '🛎️ Concierge',
          value: 'Use `/concierge` for guest assistance.',
          inline: false
        },
        {
          name: '📜 House Rules',
          value: 'Use `/house-rules` for community guidelines.',
          inline: false
        },
        {
          name: '✉️ Guest Services',
          value: 'Use `/service` to contact management.',
          inline: false
        }
      )
      .setFooter({
        text: 'The B Continental • By Order of Don Bre'
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
