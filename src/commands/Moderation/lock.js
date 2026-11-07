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
        .setName('lock')
        .setDescription('Activate Continental Lockdown Protocol in this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false),

    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward lock interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'lock'
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
                    message: 'Continental Lockdown Protocol is available only in text and announcement channels.'
                });
            }

            const botMember = interaction.guild.members.me ??
                await interaction.guild.members.fetchMe();

            if (!channel.permissionsFor(botMember)?.has(
                PermissionFlagsBits.ManageChannels
            )) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.PERMISSION,
                    message: 'The Steward requires Manage Channels permission to activate lockdown.'
                });
            }

            const currentOverwrite =
                channel.permissionOverwrites.cache.get(everyoneRole.id);

            if (currentOverwrite?.deny.has(PermissionFlagsBits.SendMessages)) {
                return await InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            '🔒 THE STEWARD | LOCKDOWN ALREADY ACTIVE',
                            [
                                '**THE B CONTINENTAL — SECURITY OFFICE**',
                                '',
                                `**Channel:** ${channel}`,
                                '**Status:** LOCKED',
                                '',
                                'The @everyone role is already denied permission to send messages in this channel.'
                            ].join('\n')
                        )
                    ]
                });
            }

            await channel.permissionOverwrites.edit(
                everyoneRole,
                { SendMessages: false },
                {
                    reason: `Continental Lockdown activated by ${interaction.user.tag}`
                }
            );

            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'Channel Locked',
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
                        '🔒 THE STEWARD | LOCKDOWN ACTIVATED',
                        [
                            '**THE B CONTINENTAL — SECURITY OFFICE**',
                            '',
                            `**Channel:** ${channel}`,
                            '**Security Status:** LOCKDOWN ACTIVE',
                            '**Restriction:** @everyone messaging denied',
                            `**Authorized By:** ${interaction.user.tag}`,
                            '',
                            '*Continental Security has activated channel lockdown.*',
                            '',
                            'Members with applicable role overrides or Administrator permissions may still be able to communicate.',
                            '',
                            '🗝️ Use `/unlock` to lift the restriction.'
                        ].join('\n')
                    )
                ]
            });

        } catch (error) {
            logger.error('Steward lockdown error:', error);

            await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'The Steward could not activate lockdown. Verify channel permissions and try again.'
            });
        }
    }
};
