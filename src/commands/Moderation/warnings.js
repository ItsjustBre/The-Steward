import { getColor } from '../../config/bot.js';
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { WarningService } from '../../services/moderation/warningService.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Review a guest’s Continental disciplinary warning history.')
        .addUserOption(option =>
            option
                .setName('target')
                .setRequired(true)
                .setDescription('The guest whose warning history will be reviewed.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .setDMPermission(false),

    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Warnings interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'warnings'
            });
            return;
        }

        const target = interaction.options.getUser('target');
        const guildId = interaction.guildId;

        const validWarnings = await WarningService.getWarnings(
            guildId,
            target.id
        );

        const totalWarns = validWarnings.length;

        if (totalWarns === 0) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    createEmbed({
                        title: '⚖️ THE STEWARD | DISCIPLINARY HISTORY',
                        description: [
                            '**THE B CONTINENTAL — DISCIPLINARY OFFICE**',
                            '',
                            `**Guest:** ${target.tag}`,
                            '**Total Warnings:** 0',
                            '',
                            '✅ No formal warnings are currently recorded for this guest.',
                            '',
                            '*The Continental disciplinary record is clear.*'
                        ].join('\n')
                    }).setColor(getColor('success'))
                ],
                components: []
            });
            return;
        }

        const embed = createEmbed({
            title: '⚖️ THE STEWARD | DISCIPLINARY HISTORY',
            description: [
                '**THE B CONTINENTAL — DISCIPLINARY OFFICE**',
                '',
                `**Guest:** ${target.tag}`,
                `**Total Formal Warnings:** ${totalWarns}`,
                '',
                'The following disciplinary actions are recorded in the Continental archives.'
            ].join('\n')
        }).setColor(getColor('warning'));

        const warningFields = validWarnings
            .slice(0, 25)
            .map((warning, index) => {
                const timestamp = Number(warning.timestamp);
                const discordTimestamp = Math.floor(timestamp / 1000);

                const date = Number.isFinite(discordTimestamp)
                    ? `<t:${discordTimestamp}:F> (<t:${discordTimestamp}:R>)`
                    : 'Unknown';

                return {
                    name: `⚠️ Warning #${index + 1}`,
                    value: [
                        `**Violation / Reason:** ${String(warning.reason || 'No reason provided').slice(0, 500)}`,
                        `**Issuing Moderator:** <@${warning.moderatorId}>`,
                        `**Date Issued:** ${date}`
                    ].join('\n').slice(0, 1024),
                    inline: false
                };
            });

        embed.addFields(warningFields);

        if (totalWarns > 25) {
            embed.setDescription(
                embed.data.description +
                `\n\n*Displaying 25 of ${totalWarns} warnings.*`
            );
        }

        embed.setFooter({
            text: 'THE B CONTINENTAL • Disciplinary Archives'
        });

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(
                    `warning_delete_specific:${target.id}:${interaction.user.id}`
                )
                .setLabel('Remove Warning')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId(
                    `warning_clear_all:${target.id}:${interaction.user.id}`
                )
                .setLabel('Clear Disciplinary Warnings')
                .setStyle(ButtonStyle.Danger)
        );

        await logEvent({
            client,
            guild: interaction.guild,
            event: {
                action: 'Warnings Viewed',
                target: `${target.tag} (${target.id})`,
                executor: `${interaction.user.tag} (${interaction.user.id})`,
                reason: `Viewed ${totalWarns} warnings`,
                metadata: {
                    userId: target.id,
                    moderatorId: interaction.user.id,
                    totalWarnings: totalWarns
                }
            }
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            components: [actionRow]
        });
    }
};
