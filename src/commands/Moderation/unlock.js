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
        .setName('unlock')
        .setDescription('Lift Continental Lockdown Protocol in this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward unlock interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'unlock'
            });
            return;
        }

        const channel = interaction.channel;
        const everyoneRole = interaction.guild.roles.everyone;

        try {
            if (
                channel.type !== ChannelType.GuildText &&
                channel.type !== ChannelType.GuildAnnouncement
            ) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Continental Lockdown Protocol is only available in text and announcement channels.'
                });
            }

            const botMember = interaction.guild.members.me ??
                await interaction.guild.members.fetchMe();

            if (!channel.permissionsFor(botMember)?.has(
                PermissionFlagsBits.ManageChannels
            )) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.PERMISSION,
                    message: 'The Steward requires Manage Channels permission to lift lockdown.'
                });
            }

            const currentOverwrite =
                channel.permissionOverwrites.cache.get(everyoneRole.id);

            if (
                !currentOverwrite?.deny.has(
                    PermissionFlagsBits.SendMessages
                )
            ) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            '🔓 THE STEWARD | NO ACTIVE CHANNEL DENY',
                            [
                                '**THE B CONTINENTAL — SECURITY OFFICE**',
                                '',
                                `**Channel:** ${channel}`,
                                '',
                                'No explicit @everyone messaging denial was found on this channel.',
                                '',
                                '*No permissions were changed.*'
                            ].join('\n')
                        )
                    ]
                });
            }

            await channel.permissionOverwrites.edit(
                everyoneRole,
                { SendMessages: null },
                {
                    reason: `Continental Lockdown lifted by ${interaction.user.tag}`
                }
            );

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'Channel Unlocked',
                    target: channel.toString(),
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    metadata: {
                        channelId: channel.id,
                        category: channel.parent?.name || 'None',
                        moderatorId: interaction.user.id
                    }
                }
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    successEmbed(
                        '🔓 THE STEWARD | LOCKDOWN LIFTED',
                        [
                            '**THE B CONTINENTAL — SECURITY OFFICE**',
                            '',
                            `**Channel:** ${channel}`,
                            '**Security Status:** LOCKDOWN LIFTED',
                            '**Action:** Explicit @everyone messaging denial removed',
                            `**Authorized By:** ${interaction.user.tag}`,
                            '',
                            '*The channel will now follow its remaining role, channel, and category permissions.*',
                            '',
                            '🗝️ Continental Protocol remains in effect.'
                        ].join('\n')
                    )
                ]
            });

        } catch (error) {
            logger.error('Steward unlock error:', error);

            await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'The Steward could not lift lockdown. Verify channel permissions and try again.'
            });
        }
    }
};
