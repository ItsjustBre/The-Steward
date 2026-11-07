import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';

export default {

  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription(
      'Contact Guest Services at The B Continental'
    ),

  category: 'Core',

  async execute(interaction) {

    const embed = new EmbedBuilder()
      .setColor(0x6A0D25)
      .setTitle(
        '🗝️ THE B CONTINENTAL | GUEST ASSISTANCE'
      )
      .setDescription(
        'Welcome to Guest Assistance.\n\n' +
        'At The B Continental, every member of ' +
        'The Syndicate deserves to be heard.\n\n' +

        '🛎️ **The Concierge**\n' +
        'General inquiries, hotel navigation, and guest guidance.\n' +
        'Use **`/hotel concierge`**.\n\n' +

        '🛡️ **The Consiglieres**\n' +
        'Community concerns, member disputes, and ' +
        'matters requiring moderator attention.\n\n' +

        '⚙️ **The Steward**\n' +
        'Technical assistance, command issues, and ' +
        'questions about the hotel systems.\n\n' +

        '🔔 **The Service Desk**\n' +
        'Submit a private request directly to Management.\n' +
        'Use **`/hotel service`** to open the official ' +
        'Guest Services request form.\n\n' +

        '*Your concerns are handled with discretion ' +
        'and respect.*'
      )
      .addFields({
        name: '🏨 Continental Guest Directory',
        value:
          'For a complete overview of hotel services, ' +
          'use **`/help`**.'
      })
      .setFooter({
        text:
          'THE B CONTINENTAL • By Order of Management'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });

  }
};
