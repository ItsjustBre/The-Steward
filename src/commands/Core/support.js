import {
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription('Contact Guest Services at The B Continental'),

  category: 'Core',

  async execute(interaction) {
    await interaction.reply({
      embeds: [{
        color: 0x6A0D25,
        title: '🗝️ THE B CONTINENTAL | GUEST ASSISTANCE',
        description:
          'Welcome to Guest Assistance.\n\n' +
          '🛎️ **The Concierge** — General inquiries\n' +
          '🛡️ **The Consiglieres** — Community concerns\n' +
          '⚙️ **The Steward** — Technical assistance\n\n' +
          'To contact management, use **`/service`** to open our official Guest Services request form.',
        footer: {
          text: 'THE B CONTINENTAL • By Order of Management'
        }
      }],
      flags: MessageFlags.Ephemeral
    });
  }
};
