  async execute(interaction) {
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

    await interaction.reply({ embeds: [embed] });
  }
};
