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

      const latency = Date.now() - start;
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

      const latency = Date.now() - start;
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

    async execute(interaction) {
        logger.info('execute called - checking if slash command or prefix command');
        logger.info(`execute - has _commandStartTime: ${!!interaction._commandStartTime}, createdTimestamp: ${interaction.createdTimestamp}`);
        
        const deferSuccess = await InteractionHelper.safeDefer(interaction);
        if (!deferSuccess) {
            logger.warn(`Ping interaction defer failed`, {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'ping'
            });
            return;
        }

        try {
            await InteractionHelper.safeEditReply(interaction, {
                content: "Pinging...",
            });

            const startTime = interaction._commandStartTime || interaction.createdTimestamp;
            logger.info(`execute - using startTime: ${startTime}, type: ${interaction._commandStartTime ? 'prefix' : 'slash'}`);
            const latency = Math.max(0, Date.now() - startTime);
            const apiLatency = Math.max(0, Math.round(interaction.client.ws.ping));
            logger.info(`execute - calculated latency: ${latency}ms, apiLatency: ${apiLatency}ms`);

            const embed = createEmbed({ title: "Pong!", description: null }).addFields(
                { name: "Bot Latency", value: `${latency}ms`, inline: true },
                { name: "API Latency", value: `${apiLatency}ms`, inline: true },
            );

            await InteractionHelper.safeEditReply(interaction, {
                content: null,
                embeds: [embed],
            });
        } catch (error) {
            logger.error('Ping command error:', error);
            try {
                return await InteractionHelper.safeReply(interaction, {
                    embeds: [createEmbed({ title: 'System Error', description: 'Could not determine latency at this time.', color: 'error' })],
                    flags: MessageFlags.Ephemeral,
                });
            } catch (replyError) {
                logger.error('Failed to send error reply:', replyError);
            }
        }
    },
};
