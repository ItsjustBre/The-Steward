import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

import {
    successEmbed,
    warningEmbed
} from '../../utils/embeds.js';

import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { sanitizeMarkdown } from '../../utils/validation.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Send official private correspondence to a Continental guest.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The guest receiving the private correspondence.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message The Steward should deliver.')
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addBooleanOption(option =>
            option
                .setName('anonymous')
                .setDescription('Hide the staff member’s identity from the guest.')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
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
            logger.warn('Steward DM interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'dm'
            });
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const rawMessage = interaction.options.getString('message');
        const anonymous =
            interaction.options.getBoolean('anonymous') ?? false;

        if (!targetUser || targetUser.bot) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Select a valid guest account. Automated accounts cannot receive Continental correspondence.'
            });
        }

        if (targetUser.id === interaction.user.id) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'You cannot send official staff correspondence to yourself.'
            });
        }

        if (!rawMessage?.trim() || rawMessage.length > 2000) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Correspondence must contain between 1 and 2,000 characters.'
            });
        }

        const sanitized = sanitizeMarkdown(rawMessage);

        if (!sanitized?.trim()) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'The correspondence contains no valid message content.'
            });
        }

        let sentMessage;

        try {
            const dmChannel = await targetUser.createDM();

            sentMessage = await dmChannel.send({
                embeds: [
                    successEmbed(
                        '✉️ THE STEWARD | PRIVATE CORRESPONDENCE',
                        [
                            '**THE B CONTINENTAL — GUEST SERVICES**',
                            '',
                            '**Official Communication**',
                            '',
                            sanitized,
                            '',
                            '━━━━━━━━━━━━━━━━',
                            anonymous
                                ? '**Issued By:** Continental Management'
                                : `**Issued By:** ${interaction.user.tag}`,
                            '',
                            '*This correspondence was delivered through The Steward on behalf of The B Continental.*'
                        ].join('\n')
                    ).setFooter({
                        text: `THE B CONTINENTAL • Reference: ${interaction.id}`
                    })
                ],
                allowedMentions: {
                    parse: []
                }
            });

        } catch (error) {
            logger.error('Steward correspondence delivery failed:', error);

            if (error.code === 50007) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.UNKNOWN,
                    message: `The Steward could not deliver correspondence to ${targetUser.tag}. Their direct messages may be disabled.`
                });
            }

            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'The Steward could not deliver the correspondence. Check the bot logs for details.'
            });
        }

        let auditLogged = true;

        try {
            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'DM Sent',
                    target: `${targetUser.tag} (${targetUser.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: `Official correspondence | Anonymous: ${anonymous ? 'Yes' : 'No'}`,
                    metadata: {
                        userId: targetUser.id,
                        moderatorId: interaction.user.id,
                        anonymous,
                        messageLength: sanitized.length,
                        messageId: sentMessage.id,
                        referenceId: interaction.id
                    }
                }
            });

        } catch (error) {
            auditLogged = false;

            logger.error(
                'Steward correspondence audit logging failed:',
                error
            );
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                (auditLogged ? successEmbed : warningEmbed)(
                    '✉️ THE STEWARD | CORRESPONDENCE DELIVERED',
                    [
                        '**THE B CONTINENTAL — MANAGEMENT OFFICE**',
                        '',
                        `**Recipient:** ${targetUser.tag}`,
                        '**Delivery Status:** SENT',
                        `**Sender Visibility:** ${anonymous ? 'Continental Management' : interaction.user.tag}`,
                        `**Authorized By:** ${interaction.user.tag}`,
                        `**Reference:** ${interaction.id}`,
                        '',
                        auditLogged
                            ? '🗝️ The correspondence has been recorded in Continental Security.'
                            : '⚠️ The message was delivered, but its security audit could not be recorded.',
                        '',
                        '**By Order of The Continental.**'
                    ].join('\n')
                )
            ]
        });
    }
};
