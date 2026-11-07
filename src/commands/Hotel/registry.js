import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('registry')
    .setDescription('View your Continental guest registry'),

  category: 'Hotel',

  async execute(interaction) {
    const user = interaction.user;
    const member = interaction.member;

    const joinedAt = member?.joinedAt
      ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>`
      : 'Not available';

    const embed = new EmbedBuilder()
      .setColor(0xC8A96A)
      .setTitle('📖 THE B CONTINENTAL | Guest Registry')
      .setDescription(
        `Welcome back, ${user}.\n\n` +
        'Your Continental membership information is on file.'
      )
      .addFields(
        {
          name: '🗝️ Registered Guest',
          value: user.username
        },
        {
          name: '🏨 Continental Arrival',
          value: joinedAt
        },
        {
          name: '🥀 Affiliation',
          value: 'The Syndicate'
        },
        {
          name: '👑 Management',
          value: 'Don Bre'
        }
      )
      .setThumbnail(user.displayAvatarURL())
      .setFooter({
        text: 'The B Continental • Official Guest Registry'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
};
