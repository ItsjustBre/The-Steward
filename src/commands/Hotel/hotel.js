import {
  SlashCommandBuilder,
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
    const command = interaction.options.getSubcommand();

   const hotelCommands = {
  concierge: './concierge.js',
  registry: './registry.js',
  amenities: './amenities.js',
  rules: './house-rules.js',
  service: './service.js'
};

    if (hotelCommands[command]) {
      const module = await import(hotelCommands[command]);

      return await module.default.execute(interaction);
    }

    const messages = {
      checkin:
        '🗝️ Welcome to The B Continental. The Front Desk is preparing your check-in.',

      concierge:
        '🏨 The Concierge is at your service. How may the house assist you?',

      game:
        '🎮 Welcome to The B Continental Gaming Lounge. The Syndicate awaits.',

      status:
        '📖 The Guest Ledger is being prepared for your review.',

      registry:
        '📖 The Continental Guest Registry is being prepared.'
    };

    await interaction.reply({
      content:
        messages[command] ??
        '🗝️ This Continental service is currently unavailable.',
      flags: MessageFlags.Ephemeral
    });
  }
};
