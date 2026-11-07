import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { TitanBotError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { ModerationService } from '../../services/moderation/moderationService.js';

const durationChoices = [
    { name: '5 minutes', value: 5 },
    { name: '10 minutes', value: 10 },
    { name: '30 minutes', value: 30 },
    { name: '1 hour', value: 60 },
    { name: '6 hours', value: 360 },
    { name: '1 day', value: 1440 },
    { name: '1 week', value: 10080 }
];

export default {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Temporarily restrict a guest under Continental Protocol.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The guest receiving the restriction.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('Length of the temporary restriction.')
                .setRequired(true)
                .addChoices(...durationChoices)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the disciplinary restriction.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward timeout interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'timeout'
            });
            return;
        }

        const targetUser = interaction.options.getUser('target');
        const member = interaction.options.getMember('target');
        const durationMinutes = interaction.options.getInteger('duration');

        const reason =
            interaction.options.getString('reason')?.trim() ||
            'No reason provided';

        if (!targetUser) {
            throw new TitanBotError(
                'Missing target user',
                ErrorTypes.USER_INPUT,
                'You must identify the guest receiving the restriction.',
                { subtype: 'invalid_user' }
            );
        }

        if (targetUser.id === interaction.user.id) {
            throw new TitanBotError(
                'Cannot timeout self',
                ErrorTypes.VALIDATION,
                'You cannot place yourself under a temporary restriction.'
            );
        }

        if (targetUser.id === client.user.id) {
            throw new TitanBotError(
                'Cannot timeout bot',
                ErrorTypes.VALIDATION,
                'The Steward cannot restrict its own access.'
            );
        }

        if (!member) {
            throw new TitanBotError(
                'Target not found',
                ErrorTypes.USER_INPUT,
                'This guest is not currently registered in the Continental.'
            );
        }

        const durationChoice = durationChoices.find(
            choice => choice.value === durationMinutes
        );

        if (!durationChoice) {
            throw new TitanBotError(
                'Invalid timeout duration',
                ErrorTypes.VALIDATION,
                'Please select one of the available restriction durations.'
            );
        }

        const durationMs = durationMinutes * 60 * 1000;

        const result = await ModerationService.timeoutUser({
            guild: interaction.guild,
            member,
            moderator: interaction.member,
            durationMs,
            reason
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    '⏳ THE STEWARD | TEMPORARY RESTRICTION',
                    [
                        '**THE B CONTINENTAL — SECURITY OFFICE**',
                        '',
                        `**Guest:** ${targetUser.tag}`,
                        '**Disciplinary Action:** TEMPORARY RESTRICTION',
                        `**Duration:** ${durationChoice.name}`,
                        `**Reason:** ${reason}`,
                        `**Disciplinary Case:** #${result.caseId}`,
                        '',
                        '*The guest has been placed under temporary communication restrictions.*',
                        '',
                        '🔑 Continental communication privileges will be restored when the restriction expires, unless another restriction applies.'
                    ].join('\n')
                )
            ]
        });
    }
};
