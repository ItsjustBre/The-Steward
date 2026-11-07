import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

import {
    successEmbed,
    warningEmbed
} from '../../utils/embeds.js';

import { logModerationAction } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

const MAX_TARGETS = 20;

export default {
    data: new SlashCommandBuilder()
        .setName('masskick')
        .setDescription('Remove multiple guests under Continental Security Protocol.')
        .addStringOption(option =>
            option
                .setName('users')
                .setDescription('Up to 20 Discord user IDs or mentions, separated by spaces or commas.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the coordinated guest removal.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),

    category: 'moderation',

    abuseProtection: {
        maxAttempts: 3,
        windowMs: 60_000
    },

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward masskick defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'masskick'
            });
            return;
        }

        const usersInput = interaction.options.getString('users');

        const reason =
            interaction.options.getString('reason')?.trim() ||
            'Mass guest removal — No reason provided';

        const entries = usersInput.trim().split(/[\s,]+/).filter(Boolean);
        const userIds = [];

        for (const entry of entries) {
            const id = entry.replace(/^<@!?(\d+)>$/, '$1');

            if (!/^\d{17,20}$/.test(id)) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: `Invalid Discord user ID or mention: ${entry.slice(0, 80)}`
                });
            }

            if (!userIds.includes(id)) {
                userIds.push(id);
            }
        }

        if (userIds.length === 0 || userIds.length > MAX_TARGETS) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Provide between 1 and 20 unique Discord user IDs or mentions.'
            });
        }

        if (
            userIds.includes(interaction.user.id) ||
            userIds.includes(client.user.id)
        ) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'You cannot include yourself or The Steward in a mass removal.'
            });
        }

        const confirmId = `steward_masskick_confirm_${interaction.id}`;
        const cancelId = `steward_masskick_cancel_${interaction.id}`;

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(confirmId)
                .setLabel('Confirm Guest Removal')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(cancelId)
                .setLabel('Cancel Operation')
                .setStyle(ButtonStyle.Secondary)
        );

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                warningEmbed(
                    '🚨 THE STEWARD | REMOVAL AUTHORIZATION',
                    [
                        '**THE B CONTINENTAL — SECURITY OFFICE**',
                        '',
                        '**Operation:** MASS GUEST REMOVAL',
                        `**Guests Targeted:** ${userIds.length}`,
                        `**Reason:** ${reason}`,
                        '',
                        '**Target IDs:**',
                        userIds.map(id => `• ${id}`).join('\n'),
                        '',
                        '⚠️ Confirming will remove these guests from the server. They will not be banned and may return with a valid invitation.',
                        '',
                        '**Confirm or cancel within 60 seconds.**'
                    ].join('\n')
                )
            ],
            components: [buttons]
        });

        let confirmation;

        try {
            const response = await interaction.fetchReply();

            confirmation = await response.awaitMessageComponent({
                filter: buttonInteraction =>
                    buttonInteraction.user.id === interaction.user.id &&
                    [confirmId, cancelId].includes(buttonInteraction.customId),
                time: 60_000
            });
        } catch {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    warningEmbed(
                        '⌛ THE STEWARD | AUTHORIZATION EXPIRED',
                        'The mass guest removal was not authorized. No guests were removed.'
                    )
                ],
                components: []
            });
            return;
        }

        if (confirmation.customId === cancelId) {
            await confirmation.update({
                embeds: [
                    successEmbed(
                        '🗝️ THE STEWARD | OPERATION CANCELLED',
                        'Mass guest removal has been cancelled. No guests were removed.'
                    )
                ],
                components: []
            });
            return;
        }

        await confirmation.update({
            embeds: [
                warningEmbed(
                    '🚨 THE STEWARD | REMOVAL IN PROGRESS',
                    `Processing ${userIds.length} guest removal request(s).`
                )
            ],
            components: []
        });

        const results = {
            successful: [],
            failed: [],
            skipped: [],
            auditFailures: 0
        };

        for (const userId of userIds) {
            try {
                const member = await interaction.guild.members
                    .fetch(userId)
                    .catch(() => null);

                if (!member) {
                    results.failed.push({
                        userId,
                        reason: 'Guest is not in the server'
                    });
                    continue;
                }

                const modCheck = ModerationService.validateHierarchy(
                    interaction.member,
                    member,
                    'kick'
                );

                if (!modCheck.valid) {
                    results.skipped.push({
                        userId,
                        reason: ModerationService.buildHierarchySkipReason(
                            interaction.member,
                            member,
                            'kick'
                        )
                    });
                    continue;
                }

                const botCheck = ModerationService.validateBotHierarchy(
                    member,
                    'kick'
                );

                if (!botCheck.valid) {
                    results.skipped.push({
                        userId,
                        reason: ModerationService.buildHierarchySkipReason(
                            interaction.member,
                            member,
                            'kick',
                            'bot'
                        )
                    });
                    continue;
                }

                if (!member.kickable) {
                    results.skipped.push({
                        userId,
                        reason: 'The Steward cannot remove this guest due to role hierarchy or permissions.'
                    });
                    continue;
                }

                await member.kick(reason);

                results.successful.push({
                    user: member.user.tag,
                    userId
                });

                try {
                    await logModerationAction({
                        client,
                        guild: interaction.guild,
                        event: {
                            action: 'Member Kicked',
                            target: `${member.user.tag} (${member.user.id})`,
                            executor: `${interaction.user.tag} (${interaction.user.id})`,
                            reason: `${reason} (Mass Kick)`,
                            metadata: {
                                userId: member.user.id,
                                moderatorId: interaction.user.id,
                                massKick: true
                            }
                        }
                    });
                } catch (auditError) {
                    results.auditFailures++;

                    logger.error(
                        `Steward masskick audit failed for ${userId}:`,
                        auditError
                    );
                }

            } catch (error) {
                logger.error(`Steward failed to kick ${userId}:`, error);

                results.failed.push({
                    userId,
                    reason: 'Guest removal failed'
                });
            }
        }

        const lines = [
            '**THE B CONTINENTAL — SECURITY OFFICE**',
            '',
            '**Operation:** MASS GUEST REMOVAL',
            `**Authorized By:** ${interaction.user.tag}`,
            '',
            `**Successfully Removed:** ${results.successful.length}`,
            `**Skipped:** ${results.skipped.length}`,
            `**Failed:** ${results.failed.length}`,
            ''
        ];

        if (results.successful.length) {
            lines.push(
                '**🚪 GUESTS REMOVED**',
                ...results.successful.map(item =>
                    `• ${item.user} (${item.userId})`
                ),
                ''
            );
        }

        if (results.skipped.length) {
            lines.push(
                '**⚠️ PROTECTED / SKIPPED**',
                ...results.skipped.map(item =>
                    `• ${item.userId}: ${item.reason}`
                ),
                ''
            );
        }

        if (results.failed.length) {
            lines.push(
                '**❌ UNSUCCESSFUL**',
                ...results.failed.map(item =>
                    `• ${item.userId}: ${item.reason}`
                ),
                ''
            );
        }

        if (results.auditFailures) {
            lines.push(
                `⚠️ Audit logging failed for ${results.auditFailures} successful removal(s).`,
                ''
            );
        }

        lines.push('**Continental Protocol remains in effect.**');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                (results.failed.length || results.skipped.length
                    ? warningEmbed
                    : successEmbed)(
                    '🚪 THE STEWARD | REMOVAL OPERATION COMPLETE',
                    lines.join('\n').slice(0, 4000)
                )
            ],
            components: []
        });
    }
};
