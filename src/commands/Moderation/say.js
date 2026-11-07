import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags,
    AllowedMentionsTypes
} from 'discord.js';

import { successEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';
import { sanitizeInput } from '../../utils/validation.js';

const TEXT_CHANNEL_TYPES = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement
];

function resolveTargetChannel(interaction) {
    const selected = interaction.options.getChannel('channel');

    if (selected) {
        return selected;
    }

    if (
        !interaction.channel ||
        !TEXT_CHANNEL_TYPES.includes(interaction.channel.type)
    ) {
        return null;
    }

    return interaction.channel;
}

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Issue an official Continental dispatch through The Steward.')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The official message The Steward should deliver.')
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Destination channel (defaults to the current channel).')
                .addChannelTypes(...TEXT_CHANNEL_TYPES)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),

    category: 'moderation',

    abuseProtection: {
        maxAttempts: 8,
        windowMs: 60_000
    },

    async execute(interaction, config, client) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Steward dispatch interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'say'
            });
            return;
        }

        const rawMessage = interaction.options.getString('message');
        const message = sanitizeInput(rawMessage, 2000);

        if (!message?.trim()) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'A Continental dispatch cannot be empty.'
            });
        }

        const channel = resolveTargetChannel(interaction);

        if (!channel) {
            return await replyUserError(interaction, {
                type: ErrorTypes.VALIDATION,
                message: 'Select a text or announcement channel for this dispatch.'
            });
        }

        const botMember =
            interaction.guild.members.me ??
            await interaction.guild.members.fetchMe();

        const memberPermissions = channel.permissionsFor(interaction.member);
        const botPermissions = channel.permissionsFor(botMember);

        if (!memberPermissions?.has(PermissionFlagsBits.SendMessages)) {
            return await replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: `You do not have permission to send messages in ${channel}.`
            });
        }

        if (!botPermissions?.has(PermissionFlagsBits.SendMessages)) {
            return await replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: `The Steward cannot send messages in ${channel}.`
            });
        }

        let sentMessage;

        try {
            sentMessage = await channel.send({
                content: message,
                allowedMentions: {
                    parse: []
                }
            });
        } catch (error) {
            logger.error('Steward dispatch delivery failed:', error);

            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'The Steward could not deliver the dispatch. Check the destination channel and permissions.'
            });
        }

        let auditLogged = true;

        try {
            await logEvent({
                client,
                guild: interaction.guild,
                event: {
                    action: 'Bot Message Sent',
                    target: `${channel} (${channel.id})`,
                    executor: `${interaction.user.tag} (${interaction.user.id})`,
                    reason: message.length > 200
                        ? `${message.slice(0, 197)}...`
                        : message,
                    metadata: {
                        channelId: channel.id,
                        messageId: sentMessage.id,
                        moderatorId: interaction.user.id,
                        messageLength: message.length,
                        officialDispatch: true
                    }
                }
            });
        } catch (error) {
            auditLogged = false;
            logger.error('Steward dispatch audit logging failed:', error);
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [
                successEmbed(
                    '📜 THE STEWARD | DISPATCH DELIVERED',
                    [
                        '**THE B CONTINENTAL — MANAGEMENT OFFICE**',
                        '',
                        '**Dispatch Status:** DELIVERED',
                        `**Destination:** ${channel}`,
                        `**Authorized By:** ${interaction.user.tag}`,
                        '',
                        `[View Official Dispatch](${sentMessage.url})`,
                        '',
                        auditLogged
                            ? '🗝️ The dispatch has been recorded in Continental Security.'
                            : '⚠️ The dispatch was delivered, but its security audit could not be recorded.',
                        '',
                        '**By Order of The Continental.**'
                    ].join('\n')
                )
            ]
        });
    }
};
