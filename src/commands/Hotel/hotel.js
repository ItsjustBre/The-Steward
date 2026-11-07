import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hotel')
    .setDescription('The B Continental — Guest Services')
    .addSubcommand(sub =>
      sub.setName('checkin')
        .setDescription('Check in at The Continental'))
    .addSubcommand(sub =>
      sub.setName('concierge')
        .setDescription('Ask The Concierge for assistance'))
    .addSubcommand(sub =>
      sub.setName('game')
        .setDescription('Play a game at The Continental'))
    .addSubcommand(sub =>
  sub.setName('status')
    .setDescription('View your guest standing'))
.addSubcommand(sub =>
  sub.setName('registry')
    .setDescription('View your Continental guest profile')),
  category: 'Hotel',

  async execute(interaction) {
    const command = interaction.options.getSubcommand();

    const messages = {
      checkin: '🗝️ Welcome to The B Continental. The front desk is preparing your check-in.',
      concierge: '🏨 The Concierge is at your service. How may the house assist you?',
      game: '🎲 The Continental Game Room is preparing your challenge.',
      status: '📖 The Guest Ledger is being prepared for your review.',
      registry: '📖 The Continental Guest Registry is being prepared.'
    };

    await interaction.reply({
      content: messages[command],
      flags: MessageFlags.Ephemeral
    });
  }
};
