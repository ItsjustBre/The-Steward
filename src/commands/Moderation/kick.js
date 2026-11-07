import {
    SlashCommandBuilder,
    PermissionFlagsBits
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Remove a guest from The B Continental.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The guest to remove from the Continental.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the guest removal.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false),

    category: 'moderation',

    async execute(interaction, config, client) {
        const targetUser = interaction.options.getUser('target');
        const member = interaction.options.getMember('target');

        const reason =
            interaction.options.getString('reason') ||
            'No reason provided';

        if (!targetUser) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                'You must identify the guest being removed.',
                { subtype: 'invalid_user' }
            );
        }

        if (targetUser.id === interaction.user.id) {
            throw new TitanBotError(
                'Cannot kick self',
                ErrorTypes.VALIDATION,
                'You cannot remove yourself from the Continental.'
            );
        }

        if (targetUser.id === client.user.id) {
            throw new TitanBotError(
                'Cannot kick bot',
                ErrorTypes.VALIDATION,
                'The Steward cannot remove itself from the Continental.'
            );
        }

        if (!member) {
            throw new TitanBotError(
                'Target not found',
                ErrorTypes.USER_INPUT,
                'This guest is not currently registered in the Continental.',
                { subtype: 'user_not_found' }
            );
        }

        const result = await ModerationService.kickUser({
            guild: interaction.guild,
            member,
            moderator: interaction.member,
            reason
        });

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    '🚪 THE STEWARD | GUEST REMOVED',
                    [
                        '**THE B CONTINENTAL — SECURITY OFFICE**',
                        '',
                        `**Guest:** ${targetUser.tag}`,
                        '**Enforcement Action:** REMOVAL',
                        `**Reason:** ${reason}`,
                        `**Disciplinary Case:** #${result.caseId}`,
                        '',
                        '*The guest has been escorted from the Continental.*',
                        '',
                        '🔑 Re-entry is subject to Continental access requirements.'
                    ].join('\n')
                )
            ]
        });
    }
};
