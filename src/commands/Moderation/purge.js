import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Activate Continental Housekeeping to clear channel messages.')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of recent messages to remove (1–100).')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),

    category: 'moderation',

    abuseProtection: {
        maxAttempts: 5,
        windowMs: 60_000
    },

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward housekeeping interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'purge'
            });
            return;
        }

        const amount = interaction.options.getInteger('amount');
        const channel = interaction.channel;

        if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Housekeeping requires a message count between 1 and 100.'
            });
        }

        if (
            channel.type !== ChannelType.GuildText &&
            channel.type !== ChannelType.GuildAnnouncement
        ) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Continental Housekeeping is available only in text and announcement channels.'
            });
        }

        try {
            const botMember =
                interaction.guild.members.me ??
                await interaction.guild.members.fetchMe();

            const botPermissions = channel.permissionsFor(botMember);

            if (
                !botPermissions?.has(PermissionFlagsBits.ManageMessages) ||
                !botPermissions?.has(PermissionFlagsBits.ReadMessageHistory)
            ) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.PERMISSION,
                    message: 'The Steward requires Manage Messages and Read Message History permissions to perform housekeeping.'
                });
            }

            const fetched = await channel.messages.fetch({
                limit: amount
            });

            const deleted = await channel.bulkDelete(fetched, true);
            const deletedCount = deleted.size;
            const skippedCount = fetched.size - deletedCount;

            try {
                await logEvent({
                    client,
                    guild: interaction.guild,
                    event: {
                        action: 'Messages Purged',
                        target: `${channel} (${deletedCount} messages)`,
                        executor: `${interaction.user.tag} (${interaction.user.id})`,
                        reason: `Deleted ${deletedCount} messages`,
                        metadata: {
                            channelId: channel.id,
                            messageCount: deletedCount,
                            requestedAmount: amount,
                            moderatorId: interaction.user.id
                        }
                    }
                });
            } catch (logError) {
                logger.error('Steward housekeeping audit logging failed:', logError);
            }

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        '🧹 THE STEWARD | HOUSEKEEPING COMPLETE',
                        [
                            '**THE B CONTINENTAL — HOUSEKEEPING DEPARTMENT**',
                            '',
                            `**Location:** ${channel}`,
                            '**Operation:** MESSAGE CLEARANCE',
                            `**Messages Requested:** ${amount}`,
                            `**Messages Removed:** ${deletedCount}`,
                            `**Messages Skipped:** ${skippedCount}`,
                            `**Authorized By:** ${interaction.user.tag}`,
                            '',
                            deletedCount > 0
                                ? '*The selected messages have been cleared from the Continental.*'
                                : '*No eligible messages were removed.*',
                            '',
                            skippedCount > 0
                                ? '⚠️ Some messages could not be removed. Discord does not permit bulk deletion of messages older than 14 days.'
                                : '✨ Housekeeping operation completed.',
                            '',
                            '**Continental Protocol remains in effect.**'
                        ].join('\n')
                    )
                ]
            });

        } catch (error) {
            logger.error('Steward housekeeping error:', error);

            await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'Housekeeping could not complete the operation. Verify channel permissions and remember that Discord cannot bulk-delete messages older than 14 days.'
            });
        }
    }
};
