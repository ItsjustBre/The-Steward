import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hotel')
    .setDescription('The B Continental — Guest Services')
    .setDMPermission(false)

    .addSubcommand(sub =>
      sub
        .setName('checkin')
        .setDescription('Check in at The Continental')
    )

    .addSubcommand(sub =>
      sub
        .setName('concierge')
        .setDescription('Your personal guide to The B Continental')
        .addStringOption(option =>
          option
            .setName('assistance')
            .setDescription('How may The Concierge assist you?')
            .setRequired(true)
            .addChoices(
              { name: '🏨 Hotel Directory', value: 'directory' },
              { name: '🎮 Gaming Lounge', value: 'gaming' },
              { name: '💄 Beauty Suite', value: 'beauty' },
              { name: '🥂 Lifestyle Salon', value: 'lifestyle' },
              { name: '🗝️ Guest Services', value: 'services' }
            )
        )
    )

    .addSubcommand(sub =>
      sub
        .setName('game')
        .setDescription('Visit the Continental Gaming Lounge')
    )

    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('View your guest standing')
    )

    .addSubcommand(sub =>
      sub
        .setName('registry')
        .setDescription('View your Continental guest profile')
    )

    .addSubcommand(sub =>
      sub
        .setName('amenities')
        .setDescription('Explore the lounges of The B Continental')
    )

    .addSubcommand(sub =>
      sub
        .setName('rules')
        .setDescription('Read the Continental Code')
    )

    .addSubcommand(sub =>
      sub
        .setName('service')
        .setDescription('Request private assistance from the Service Desk')
    ),

  category: 'Hotel',

  async execute(interaction) {
    try {
      const command = interaction.options.getSubcommand();

      // Existing hotel departments
      const hotelCommands = {
  concierge: './modules/concierge.js',
  registry: './modules/registry.js',
  amenities: './modules/amenities.js',
  rules: './modules/house-rules.js',
  service: './service.js'
};
      if (hotelCommands[command]) {
        const module = await import(hotelCommands[command]);
        return await module.default.execute(interaction);
      }

      // FRONT DESK — CHECK-IN
      if (command === 'checkin') {
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

        return await interaction.reply({
          embeds: [embed],
          allowedMentions: { parse: [] }
        });
      }

      // GAMING LOUNGE
      if (command === 'game') {
        const embed = new EmbedBuilder()
          .setColor(0xC8A96A)
          .setTitle('🎮 THE B CONTINENTAL | Gaming Lounge')
          .setDescription(
            'Welcome to the Continental Gaming Lounge.\n\n' +
            'Where The Syndicate comes together to play, compete, and unwind.\n\n' +
            '*Every player has a seat at our table.*'
          )
          .addFields(
            {
              name: '🎮 Gaming Sessions',
              value: 'Find fellow members and organize multiplayer adventures.'
            },
            {
              name: '🏆 Continental Tournaments',
              value: 'Community competitions, challenges, and special events.'
            },
            {
              name: '🥀 Syndicate Game Nights',
              value: 'Join Don Bre and the family for community gaming sessions.'
            },
            {
              name: '👑 Capo VIP Experiences',
              value: 'Special gaming opportunities and subscriber perks.'
            },
            {
              name: '🗝️ House Etiquette',
              value: 'Competition is encouraged. Respect is required.'
            }
          )
          .setFooter({
            text: 'The B Continental • Gaming Lounge'
          })
          .setTimestamp();

        return await interaction.reply({
          embeds: [embed]
        });
      }

      // GUEST STATUS
      if (command === 'status') {
        const user = interaction.user;
        const member = interaction.member;

        const joinedAt = member?.joinedAt
          ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:D>`
          : 'Not available';

        const roles = member?.roles?.cache;

        const standing =
          roles?.some(role => role.name.toLowerCase() === 'capos')
            ? '👑 Capo'
            : roles?.some(role => role.name.toLowerCase() === 'consiglieres')
              ? '🗝️ Consigliere'
              : '🥀 Syndicate Member';

        const embed = new EmbedBuilder()
          .setColor(0xC8A96A)
          .setTitle('📖 THE B CONTINENTAL | Guest Standing')
          .setDescription(
            `Welcome back, ${user}.\n\n` +
            'The Steward has retrieved your Continental guest information.'
          )
          .addFields(
            {
              name: '🗝️ Registered Guest',
              value: user.username,
              inline: true
            },
            {
              name: '🥀 House Affiliation',
              value: standing,
              inline: true
            },
            {
              name: '🏨 Date of Arrival',
              value: joinedAt
            },
            {
              name: '👑 Management',
              value: 'Don Bre'
            }
          )
          .setThumbnail(user.displayAvatarURL())
          .setFooter({
            text: 'The B Continental • Guest Ledger'
          })
          .setTimestamp();

        return await interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral
        });
      }

      return await interaction.reply({
        content: '🗝️ This Continental service is currently unavailable.',
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error('[THE STEWARD] Hotel command error:', error);

      const response = {
        content: '🗝️ The Steward encountered an issue processing your request.',
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
