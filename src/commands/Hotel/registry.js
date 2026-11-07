import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('registry')
    .setDescription('View your guest registry at The B Continental.'),

  async execute(interaction) {
    const member = interaction.member;
    const user = interaction.user;

    const joinedAt = member?.joinedAt
      ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>`
      : 'Not available';

    const embed = new EmbedBuilder()
      .setColor('#C6A667')
      .setTitle('🗝️ THE B CONTINENTAL | GUEST REGISTRY')
      .setDescription(
        `**Registered Guest:** ${user}\n\n` +
        `**Discord Username:** ${user.username}\n` +
        `**Guest ID:** ${user.id}\n` +
        `**Continental Arrival:** ${joinedAt}\n\n` +
        '🥀 **Affiliation:** The Syndicate\n' +
        '🏨 **Residence:** The B Continental\n' +
        '👑 **Management:** Don Bre\n\n' +
        '*Your presence is acknowledged. Your place in the Continental is recognized.*'
      )
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: 'THE STEWARD • Official Guest Registry' })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
