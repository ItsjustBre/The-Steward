import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Restore a former guest’s eligibility to enter The B Continental.')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('Discord user ID or mention of the banned guest.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for restoring Continental access.')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDMPermission(false),

    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward unban interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'unban'
            });
            return;
        }

        const rawTarget = interaction.options.getString('target');
        const targetId = rawTarget.replace(/[<@!>]/g, '').trim();

        if (!/^\d{17,20}$/.test(targetId)) {
            return replyUserError(interaction, {
                type: ErrorTypes.USER_INPUT,
                message: 'Please provide a valid Discord user ID or mention.'
            });
        }

        const targetUser = await client.users.fetch(targetId).catch(() => null);

        if (!targetUser) {
            return replyUserError(interaction, {
                type: ErrorTypes.USER_INPUT,
                message: `The Steward could not locate a guest with ID \`${targetId}\`.`
            });
        }

        const reason =
            interaction.options.getString('reason')?.trim() ||
            'No reason provided';

        const result = await ModerationService.unbanUser({
            guild: interaction.guild,
            user: targetUser,
            moderator: interaction.member,
            reason
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    '🔑 THE STEWARD | ACCESS RESTORED',
                    [
                        '**THE B CONTINENTAL — SECURITY OFFICE**',
                        '',
                        `**Former Guest:** ${targetUser.tag}`,
                        '**Enforcement Action:** BAN REVOKED',
                        '**Status:** ELIGIBLE FOR RE-ENTRY',
                        `**Reason:** ${reason}`,
                        `**Authorized By:** ${interaction.user.tag}`,
                        `**Disciplinary Case:** #${result.caseId}`,
                        '',
                        '*The guest’s ban has been lifted by Continental Security.*',
                        '',
                        '🏨 The guest may return through a valid server invitation.',
                        '',
                        '**Continental Protocol remains in effect.**'
                    ].join('\n')
                )
            ]
        });
    }
};
