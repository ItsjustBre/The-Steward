import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  version,
  MessageFlags
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View The Steward system intelligence')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  category: 'Core',

  async execute(interaction) {
    try {
      await InteractionHelper.safeDefer(interaction, {
        flags: MessageFlags.Ephemeral
      });

      const client = interaction.client;
      const uptime = Math.floor(client.uptime / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      const memory = (
        process.memoryUsage().heapUsed / 1024 / 1024
      ).toFixed(2);

      const embed = createEmbed({
        title: '🗝️ THE STEWARD | SYSTEM INTELLIGENCE',
        description:
          'The B Continental administrative systems report.\n\n' +
          'All information reflects the current bot process.',
        color: 'primary'
      }).addFields(
        {
          name: '🟢 System Status',
          value: 'Operational',
          inline: true
        },
        {
          name: '⏱️ Uptime',
          value: `${hours}h ${minutes}m`,
          inline: true
        },
        {
          name: '🏨 Connected Servers',
          value: `${client.guilds.cache.size}`,
          inline: true
        },
        {
          name: '👥 Members',
          value: `${client.guilds.cache.reduce(
            (total, guild) => total + guild.memberCount, 0
          )}`,
          inline: true
        },
        {
          name: '⚙️ Node.js',
          value: process.version,
          inline: true
        },
        {
          name: '💻 Discord.js',
          value: `v${version}`,
          inline: true
        },
        {
          name: '🧠 Memory Usage',
          value: `${memory} MB`,
          inline: true
        }
      ).setFooter({
        text: 'THE B CONTINENTAL • Management Systems'
      }).setTimestamp();

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed]
      });

    } catch (error) {
      logger.error('Steward stats error:', error);

      await InteractionHelper.safeReply(interaction, {
        content: 'Unable to retrieve system statistics.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
};

