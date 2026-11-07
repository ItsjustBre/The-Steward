import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Check in at The B Continental Front Desk')
    .setDMPermission(false),

  category: 'Hotel',

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setColor(0xC8A96A)
        .setTitle('🗝️ THE B CONTINENTAL | Guest Check-In')
        .setDescription(
          `Welcome to The B Continental, ${interaction.user}.\n\n` +
          'Your arrival has been acknowledged by The Steward.\n\n' +
          '🏨 **Residence:** The B Continental\n' +
          '🥀 **Community:** The Syndicate\n' +
          '👑 **Management:** Don Bre\n\n' +
          '*Welcome to the family. Enjoy your stay.*'
        )
        .setFooter({
          text: 'The B Continental • By Order of Management'
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        allowedMentions: { parse: [] }
      });

    } catch (error) {
      console.error('[THE STEWARD] Check-in error:', error);

      const response = {
        content:
          '🗝️ The Front Desk is temporarily unavailable. Please try checking in again.',
        flags: MessageFlags.Ephemeral
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(response).catch(console.error);
      } else {
        await interaction.reply(response).catch(console.error);
      }
    }
  }
};
