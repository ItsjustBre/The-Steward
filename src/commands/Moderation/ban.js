import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Permanently revoke a guest’s access to The B Continental.')
        .addUserOption((option) =>
            option
                .setName('target')
                .setDescription('The guest whose access will be revoked.')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('reason')
                .setDescription('Reason for the disciplinary action.'),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    category: 'moderation',

    async execute(interaction, config, client) {
        const user = interaction.options.getUser('target');
        const reason =
            interaction.options.getString('reason') ||
            'No reason provided';

        if (!user) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                'You must identify the guest whose access is being revoked.',
                { subtype: 'invalid_user' },
            );
        }

        if (user.id === interaction.user.id) {
            throw new TitanBotError(
                'Cannot ban self',
                ErrorTypes.VALIDATION,
                'You cannot revoke your own Continental access.',
            );
        }

        if (user.id === client.user.id) {
            throw new TitanBotError(
                'Cannot ban bot',
                ErrorTypes.VALIDATION,
                'The Steward cannot revoke its own access.',
            );
        }

        const result = await ModerationService.banUser({
            guild: interaction.guild,
            user,
            moderator: interaction.member,
            reason,
        });

        await InteractionHelper.universalReply(interaction, {
            embeds: [
                successEmbed(
                    '🚫 THE STEWARD | ACCESS REVOKED',
                    [
                        '**THE B CONTINENTAL — SECURITY OFFICE**',
                        '',
                        `**Guest:** ${user.tag}`,
                        '**Status:** BANNED',
                        `**Reason:** ${reason}`,
                        `**Disciplinary Case:** #${result.caseId}`,
                        '',
                        '*Continental privileges have been revoked.*',
                    ].join('\n'),
                ),
            ],
        });
    },
};
