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
        .setName('massban')
        .setDescription('Initiate mass access revocation under Continental Security Protocol.')
        .addStringOption(option =>
            option
                .setName('users')
                .setDescription('Up to 20 Discord user IDs or mentions, separated by spaces or commas.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the mass access revocation.')
        )
        .addIntegerOption(option =>
            option
                .setName('delete_days')
                .setDescription('Days of message history to delete (0–7).')
                .setMinValue(0)
                .setMaxValue(7)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
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
            logger.warn('Steward massban defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'massban'
            });
            return;
        }

        const usersInput = interaction.options.getString('users');
        const reason =
            interaction.options.getString('reason')?.trim() ||
            'Mass access revocation — No reason provided';

        const deleteDays =
            interaction.options.getInteger('delete_days') ?? 0;

        const entries = usersInput.trim().split(/[\s,]+/).filter(Boolean);
        const userIds = [];

        for (const entry of entries) {
            const id = entry.replace(/^<@!?(\d+)>$/, '$1');

            if (!/^\d{17,20}$/.test(id)) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: `Invalid user ID or mention: ${entry.slice(0, 80)}`
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
                message: 'You cannot include yourself or The Steward in a mass ban.'
            });
        }

        const confirmId = `steward_massban_confirm_${interaction.id}`;
        const cancelId = `steward_massban_cancel_${interaction.id}`;

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(confirmId)
                .setLabel('Confirm Revocation')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(cancelId)
                .setLabel('Cancel Operation')
                .setStyle(ButtonStyle.Secondary)
        );

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                warningEmbed(
                    '🚨 THE STEWARD | AUTHORIZATION REQUIRED',
                    [
                        '**THE B CONTINENTAL — SECURITY OFFICE**',
                        '',
                        '**Operation:** MASS ACCESS REVOCATION',
                        `**Guests Targeted:** ${userIds.length}`,
                        `**Message History Removal:** ${deleteDays} day(s)`,
                        `**Reason:** ${reason}`,
                        '',
                        '**Target IDs:**',
                        userIds.map(id => `• ${id}`).join('\n'),
                        '',
                        '⚠️ This action will permanently ban the listed accounts until an authorized moderator reverses their bans.',
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
                        'The mass access revocation was not authorized. No bans were attempted.'
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
                        'Mass access revocation has been cancelled. No bans were attempted.'
                    )
                ],
                components: []
            });
            return;
        }

        await confirmation.update({
            embeds: [
                warningEmbed(
                    '🚨 THE STEWARD | SECURITY OPERATION ACTIVE',
                    `Processing ${userIds.length} guest access revocation request(s).`
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
                const user = await client.users.fetch(userId).catch(() => null);

                if (!user) {
                    results.failed.push({
                        userId,
                        reason: 'User not found'
                    });
                    continue;
                }

                const member = await interaction.guild.members
                    .fetch(userId)
                    .catch(() => null);

                if (member) {
                    const modCheck = ModerationService.validateHierarchy(
                        interaction.member,
                        member,
                        'ban'
                    );

                    if (!modCheck.valid) {
                        results.skipped.push({
                            userId,
                            reason: ModerationService.buildHierarchySkipReason(
                                interaction.member,
                                member,
                                'ban'
                            )
                        });
                        continue;
                    }

                    const botCheck = ModerationService.validateBotHierarchy(
                        member,
                        'ban'
                    );

                    if (!botCheck.valid) {
                        results.skipped.push({
                            userId,
                            reason: ModerationService.buildHierarchySkipReason(
                                interaction.member,
                                member,
                                'ban',
                                'bot'
                            )
                        });
                        continue;
                    }
                }

                await interaction.guild.members.ban(userId, {
                    reason,
                    deleteMessageSeconds: deleteDays * 86400
                });

                results.successful.push({
                    userId,
                    user: user.tag
                });

                try {
                    await logModerationAction({
                        client,
                        guild: interaction.guild,
                        event: {
                            action: 'Member Banned',
                            target: `${user.tag} (${user.id})`,
                            executor: `${interaction.user.tag} (${interaction.user.id})`,
                            reason: `${reason} (Mass Ban)`,
                            metadata: {
                                userId: user.id,
                                moderatorId: interaction.user.id,
                                massBan: true,
                                permanent: true
                            }
                        }
                    });
                } catch (auditError) {
                    results.auditFailures++;
                    logger.error(
                        `Steward massban audit failed for ${userId}:`,
                        auditError
                    );
                }

            } catch (error) {
                logger.error(`Steward failed to ban ${userId}:`, error);

                results.failed.push({
                    userId,
                    reason: 'Ban operation failed'
                });
            }
        }

        const lines = [
            '**THE B CONTINENTAL — SECURITY OFFICE**',
            '',
            '**Operation:** MASS ACCESS REVOCATION',
            `**Authorized By:** ${interaction.user.tag}`,
            '',
            `**Successfully Banned:** ${results.successful.length}`,
            `**Skipped:** ${results.skipped.length}`,
            `**Failed:** ${results.failed.length}`,
            ''
        ];

        if (results.successful.length) {
            lines.push(
                '**🚫 ACCESS REVOKED**',
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
                `⚠️ Audit logging failed for ${results.auditFailures} successful ban(s).`,
                ''
            );
        }

        lines.push('**Continental Protocol remains in effect.**');

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                (results.failed.length || results.skipped.length
                    ? warningEmbed
                    : successEmbed)(
                    '🚨 THE STEWARD | SECURITY OPERATION COMPLETE',
                    lines.join('\n').slice(0, 4000)
                )
            ],
            components: []
        });
    }
};
