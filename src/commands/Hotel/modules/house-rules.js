import { EmbedBuilder } from 'discord.js';

export default {
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x650D28)
      .setTitle('⚖️ THE B CONTINENTAL | The Continental Code')
      .setDescription(
        'Welcome to The B Continental.\n\n' +
        'Within these walls, every guest is entitled to respect, ' +
        'discretion, and hospitality.\n\n' +
        '**By order of Don Bre and Management, ' +
        'the following rules govern the house.**'
      )
      .addFields(
        {
          name: 'I. Respect the House',
          value:
            'Treat every guest with dignity. Harassment, bullying, ' +
            'discrimination, and hate speech are prohibited.'
        },
        {
          name: 'II. No Business on Continental Grounds',
          value:
            'Threats, intimidation, doxxing, scams, and malicious ' +
            'behavior have no place within these walls.'
        },
        {
          name: 'III. Discretion Is Everything',
          value:
            'Respect privacy. Do not share personal information, ' +
            'private conversations, or images without permission.'
        },
        {
          name: 'IV. Honor the Establishment',
          value:
            'No spam, unsolicited advertising, disruptive behavior, ' +
            'or inappropriate content. Keep conversations in their designated lounges.'
        },
        {
          name: 'V. Respect Management',
          value:
            'Follow reasonable instructions from the Consiglieres, ' +
            'Underboss, and Don Bre. Staff decisions may be appealed respectfully.'
        },
        {
          name: 'VI. The High Table Has Spoken',
          value:
            'Violations may result in warnings, timeouts, removal, ' +
            'or Excommunicado, depending on severity.'
        },
        {
          name: '🗝️ A Final Word',
          value:
            'The Syndicate is family. Loyalty is appreciated, ' +
            'respect is expected, and everyone deserves a place at the table.'
        }
      )
      .setFooter({
        text: 'The B Continental • Discretion. Loyalty. Excellence.'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};
