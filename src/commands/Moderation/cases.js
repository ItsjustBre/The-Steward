import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    MessageFlags
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import { getModerationCases } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cases')
        .setDescription('Review disciplinary records maintained by The Steward.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewAuditLog)
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('filter')
                .setDescription('Filter disciplinary records by action.')
                .addChoices(
                    { name: 'All Records', value: 'all' },
                    { name: 'Access Revocations', value: 'Member Banned' },
                    { name: 'Guest Removals', value: 'Member Kicked' },
                    { name: 'Temporary Restrictions', value: 'Member Timed Out' },
                    { name: 'Formal Warnings', value: 'User Warned' }
                )
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Review records for a specific guest.')
        )
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Maximum records to retrieve (default: 10).')
                .setMinValue(1)
                .setMaxValue(50)
        ),

    category: 'moderation',

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Cases interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'cases'
            });
            return;
        }

        try {
            const filterType = interaction.options.getString('filter') || 'all';
            const targetUser = interaction.options.getUser('user');
            const limit = interaction.options.getInteger('limit') || 10;

            const filters = {
                limit,
                action: filterType === 'all' ? undefined : filterType,
                userId: targetUser?.id
            };

            const cases = await getModerationCases(
                interaction.guild.id,
                filters
            );

            if (cases.length === 0) {
                const emptyEmbed = createEmbed({
                    title: '📂 THE STEWARD | NO RECORDS FOUND',
                    description:
                        '**THE B CONTINENTAL — DISCIPLINARY ARCHIVES**\n\n' +
                        'No disciplinary records match the selected criteria.'
                });

                return await interaction.editReply({
                    embeds: [emptyEmbed],
                    components: []
                });
            }

            const CASES_PER_PAGE = 5;
            const totalPages = Math.ceil(cases.length / CASES_PER_PAGE);
            let currentPage = 1;

            const createCasesEmbed = (page) => {
                const startIndex = (page - 1) * CASES_PER_PAGE;
                const pageCases = cases.slice(
                    startIndex,
                    startIndex + CASES_PER_PAGE
                );

                const embed = createEmbed({
                    title: '⚖️ THE STEWARD | DISCIPLINARY ARCHIVES',
                    description:
                        '**THE B CONTINENTAL — SECURITY OFFICE**\n\n' +
                        `Confidential disciplinary records for **${interaction.guild.name}**.\n\n` +
                        `**Archive Page:** ${page} of ${totalPages}`
                });

                pageCases.forEach(record => {
                    const timestamp = new Date(record.createdAt);
                    const date = Number.isNaN(timestamp.getTime())
                        ? 'Unknown'
                        : timestamp.toLocaleString();

                    embed.addFields({
                        name: `📁 Case #${record.caseId} | ${record.action}`,
                        value: [
                            `**Guest:** ${record.target}`,
                            `**Consigliere / Moderator:** ${record.executor}`,
                            `**Date:** ${date}`,
                            `**Reason:** ${record.reason || 'No reason provided'}`
                        ].join('\n').slice(0, 1024),
                        inline: false
                    });
                });

                embed.setFooter({
                    text:
                        `THE B CONTINENTAL • Security Archives | ` +
                        `${cases.length} records | Page ${page}/${totalPages}`
                });

                return embed;
            };

            const createNavigationRow = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('steward_cases_previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 1),

                    new ButtonBuilder()
                        .setCustomId('steward_cases_page')
                        .setLabel(`Page ${page}/${totalPages}`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),

                    new ButtonBuilder()
                        .setCustomId('steward_cases_next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages)
                );
            };

            const message = await interaction.editReply({
                embeds: [createCasesEmbed(currentPage)],
                components: totalPages > 1
                    ? [createNavigationRow(currentPage)]
                    : []
            });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 120000,
                filter: buttonInteraction =>
                    buttonInteraction.user.id === interaction.user.id &&
                    [
                        'steward_cases_previous',
                        'steward_cases_next'
                    ].includes(buttonInteraction.customId)
            });

            collector.on('collect', async buttonInteraction => {
                try {
                    await buttonInteraction.deferUpdate();

                    if (
                        buttonInteraction.customId === 'steward_cases_previous' &&
                        currentPage > 1
                    ) {
                        currentPage--;
                    }

                    if (
                        buttonInteraction.customId === 'steward_cases_next' &&
                        currentPage < totalPages
                    ) {
                        currentPage++;
                    }

                    await interaction.editReply({
                        embeds: [createCasesEmbed(currentPage)],
                        components: [createNavigationRow(currentPage)]
                    });
                } catch (error) {
                    logger.error('Cases navigation error:', error);
                }
            });

            collector.on('end', async () => {
                const disabledRow = createNavigationRow(currentPage);

                disabledRow.components.forEach(button =>
                    button.setDisabled(true)
                );

                try {
                    await interaction.editReply({
                        components: [disabledRow]
                    });
                } catch (error) {
                    logger.warn('Unable to disable expired case navigation:', error);
                }
            });

        } catch (error) {
            logger.error('Error in cases command:', error);

            await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'The Steward could not retrieve the disciplinary archives.'
            });
        }
    }
};
