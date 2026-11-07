import {
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

function buildPingEmbed(latency, gatewayLatency) {
  const status =
    gatewayLatency < 150 ? '🟢 Stable' :
    gatewayLatency < 300 ? '🟡 Elevated Latency' :
    '🔴 High Latency';

  return createEmbed({
    title: '🗝️ THE STEWARD | CONNECTION STATUS',
    description:
      'The B Continental communication systems are responding.',
    color: 'primary'
  })
    .addFields(
      {
        name: '📡 Gateway Latency',
        value: `${gatewayLatency} ms`,
        inline: true
      },
      {
        name: '⚡ Response Time',
        value: `${latency} ms`,
        inline: true
      },
      {
        name: '🏨 Connection Status',
        value: status,
        inline: false
      }
    )
    .setFooter({
      text: 'THE B CONTINENTAL • Systems Administration'
    })
    .setTimestamp();
}

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check The Steward connection status'),

  category: 'Core',

  async prefixExecute(message) {
    try {
      const start = Date.now();

      const reply = await message.reply({
        content: '🗝️ Checking Continental communications...'
      });

      const latency = Math.max(0, Date.now() - start);
      const gatewayLatency = Math.max(
        0,
        Math.round(message.client.ws.ping)
      );

      await reply.edit({
        content: '',
        embeds: [buildPingEmbed(latency, gatewayLatency)]
      });
    } catch (error) {
      logger.error('Steward prefix ping error:', error);
    }
  },

  async execute(interaction) {
    try {
      const start = Date.now();

      const deferred = await InteractionHelper.safeDefer(
        interaction,
        { flags: MessageFlags.Ephemeral }
      );

      if (!deferred) return;

      const latency = Math.max(0, Date.now() - start);
      const gatewayLatency = Math.max(
        0,
        Math.round(interaction.client.ws.ping)
      );

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [buildPingEmbed(latency, gatewayLatency)]
      });

    } catch (error) {
      logger.error('Steward ping error:', error);
    }
  }
};
