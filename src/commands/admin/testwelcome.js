import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

import { getWelcomeConfig } from '../../utils/database.js';
import { formatWelcomeMessage } from '../../utils/welcome.js';

export default {
    data: new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('Test The Continental guest welcome message.')
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .setDMPermission(false),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: 'This command only works inside The Continental.',
                flags: MessageFlags.Ephemeral
            });
        }

        if (!interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
        )) {
            return interaction.reply({
                content: 'Only the Don may authorize this test.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {
            const guild = interaction.guild;
            const user = interaction.user;

            const member = await guild.members.fetch(user.id);

            const config = await getWelcomeConfig(
                interaction.client,
                guild.id
            );

            if (!config?.channelId) {
                return interaction.editReply(
                    '❌ No welcome channel is configured. Set one first.'
                );
            }

            const channel = await guild.channels
                .fetch(config.channelId)
                .catch(() => null);

            if (!channel?.isTextBased() || !channel.send) {
                return interaction.editReply(
                    '❌ The configured welcome channel is unavailable.'
                );
            }

            const botMember = await guild.members
                .fetchMe();

            const permissions = channel.permissionsFor(botMember);

            if (!permissions?.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ])) {
                return interaction.editReply(
                    '❌ The Steward needs View Channel, Send Messages, and Embed Links permissions.'
                );
            }

            const defaultWelcome =
                `Welcome to the family, {user}. 🥀\n\n` +
                `Your reservation has been confirmed, and ` +
                `**The Steward** is pleased to announce your arrival.\n\n` +
                `You've entered the home of ` +
                `**Don Bre & The Syndicate**, where respect ` +
                `is currency, loyalty is valued, and family comes first.\n\n` +
                `📜 **The House Code** — Know the rules.\n\n` +
                `🎭 **The Outfit** — Choose your interests.\n\n` +
                `🥂 **The Continental** — Meet the family.\n\n` +
                `*By order of Don Bre, enjoy your stay.* 🗝️`;

            const welcomeText =
                config.welcomeMessage ||
                config.welcomeEmbed?.description ||
                defaultWelcome;

            const formatted = formatWelcomeMessage(
                welcomeText,
                { user, guild, member }
            );

            const embed = new EmbedBuilder()
                .setColor('#692F3A')
                .setTitle(
                    '🥀 THE B CONTINENTAL | GUEST CHECK-IN'
                )
                .setDescription(formatted)
                .setThumbnail(
                    user.displayAvatarURL({ size: 256 })
                )
                .addFields(
                    {
                        name: '🗝️ Guest Registration',
                        value:
                            `**Guest:** ${user.toString()}\n` +
                            `**Member No.:** ${guild.memberCount}`,
                        inline: false
                    },
                    {
                        name: '📜 The House Code',
                        value:
                            'Know the rules. Respect the family.',
                        inline: true
                    },
                    {
                        name: '🎭 The Outfit',
                        value:
                            'Choose your interests and claim your place.',
                        inline: true
                    }
                )
                .setFooter({
                    text:
                        'THE B CONTINENTAL • BY ORDER OF DON BRE'
                })
                .setTimestamp();

            const message = await channel.send({
                embeds: [embed],
                allowedMentions: {
                    parse: []
                }
            });

            await interaction.editReply(
                `✅ The Steward has sent a test guest check-in to ${channel}.\n\n` +
                `[View Test Message](${message.url})`
            );

        } catch (error) {
            console.error(
                '[The Steward] Welcome test failed:',
                error
            );

            await interaction.editReply(
                '❌ The welcome test failed. Check the bot logs.'
            );
        }
    }
};
