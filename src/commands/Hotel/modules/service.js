import {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} from 'discord.js';

export default {
  async execute(interaction) {
    const subject = new TextInputBuilder()
      .setCustomId('service_subject')
      .setLabel('Nature of your request')
      .setPlaceholder('How may the house assist you?')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const details = new TextInputBuilder()
      .setCustomId('service_details')
      .setLabel('Message to Management')
      .setPlaceholder('Please describe your request...')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1500)
      .setRequired(true);

    const modal = new ModalBuilder()
      .setCustomId('continental_service_request')
      .setTitle('The Continental | Guest Services')
      .addComponents(
        new ActionRowBuilder().addComponents(subject),
        new ActionRowBuilder().addComponents(details)
      );

    await interaction.showModal(modal);
  },

  async handleModal(interaction) {
    const subject =
      interaction.fields.getTextInputValue('service_subject');

    const details =
      interaction.fields.getTextInputValue('service_details');

    const deskId = process.env.1568614792799850578;

    if (!deskId) {
      return interaction.reply({
        content: '🔔 The service desk is temporarily unavailable.',
        flags: MessageFlags.Ephemeral
      });
    }

    const channel = await interaction.guild.channels
      .fetch(deskId)
      .catch(() => null);

    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      return interaction.reply({
        content:
          '🔔 Management could not be reached. Please try again later.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xC8A96A)
      .setTitle('🔔 THE B CONTINENTAL | Guest Request')
      .addFields(
        {
          name: 'Guest',
          value: `${interaction.user} (${interaction.user.id})`
        },
        {
          name: 'Subject',
          value: subject
        },
        {
          name: 'Request',
          value: details
        }
      )
      .setFooter({
        text: 'The Continental • Staff Service Desk'
      })
      .setTimestamp();

    try {
      await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [] }
      });

      await interaction.reply({
        content:
          '🗝️ Your request has been delivered to Management. ' +
          'The house appreciates your patience.',
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error(
        '[THE STEWARD] Continental service request failed:',
        error
      );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            '🔔 Your request could not be delivered. ' +
            'Please contact Management directly.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};
