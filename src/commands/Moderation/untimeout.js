import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Restore a guest’s communication privileges at The B Continental.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The guest whose temporary restriction will be lifted.')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward untimeout interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'untimeout'
            });
            return;
        }

        const targetUser = interaction.options.getUser('target');
        const member = interaction.options.getMember('target');

        if (!targetUser) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                'You must identify the guest whose privileges will be restored.',
                { subtype: 'invalid_user' }
            );
        }

        if (!member) {
            throw new TitanBotError(
                'Target not found',
                ErrorTypes.USER_INPUT,
                'This guest is not currently registered in the Continental.'
            );
        }

        await ModerationService.removeTimeoutUser({
            guild: interaction.guild,
            member,
            moderator: interaction.member
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    '🔓 THE STEWARD | PRIVILEGES RESTORED',
                    [
                        '**THE B CONTINENTAL — SECURITY OFFICE**',
                        '',
                        `**Guest:** ${targetUser.tag}`,
                        '**Enforcement Action:** RESTRICTION LIFTED',
                        '**Status:** COMMUNICATION PRIVILEGES RESTORED',
                        `**Authorized By:** ${interaction.user.tag}`,
                        '',
                        '*The temporary communication restriction has been lifted.*',
                        '',
                        '🗝️ The guest may resume participating in the Continental, subject to all other applicable server restrictions.',
                        '',
                        '**Continental Protocol remains in effect.**'
                    ].join('\n')
                )
            ]
        });
    }
};
