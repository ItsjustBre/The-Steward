import {
    Events,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

import { botConfig } from '../config/bot.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import {
    getWelcomeConfig,
    setBirthday as dbSetBirthday
} from '../utils/database.js';
import { formatWelcomeMessage } from '../utils/welcome.js';
import {
    logEvent,
    EVENT_TYPES
} from '../services/loggingService.js';
import {
    getServerCounters,
    updateCounter
} from '../services/serverstatsService.js';
import { logger } from '../utils/logger.js';

export default {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        try {
            const { guild, user } = member;

            const config = await getGuildConfig(
                member.client,
                guild.id
            );

            const welcomeConfig = await getWelcomeConfig(
                member.client,
                guild.id
            );

            const welcomeChannelId = welcomeConfig?.channelId;

            // ========================================
            // THE B CONTINENTAL - WELCOME SYSTEM
            // ========================================

            if (welcomeConfig?.enabled && welcomeChannelId) {
                const channel =
                    guild.channels.cache.get(welcomeChannelId);

                const me = guild.members.me;

                const permissions =
                    channel?.isTextBased?.() && me
                        ? channel.permissionsFor(me)
                        : null;

                if (
                    permissions?.has([
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages
                    ])
                ) {
                    try {
                        const formatData = {
                            user,
                            guild,
                            member
                        };

                        const defaultWelcome =
                            `Welcome to the family, {user}. 🥀\n\n` +
                            `Your reservation has been confirmed, and ` +
                            `**The Steward** is pleased to announce your arrival.\n\n` +
                            `You've entered the home of ` +
                            `**Don Bre & The Syndicate**, where respect ` +
                            `is currency, loyalty is valued, and ` +
                            `family comes first.\n\n` +
                            `📜 **The House Code** — Know the rules. ` +
                            `Respect the family.\n\n` +
                            `🎭 **The Outfit** — Choose your interests ` +
                            `and claim your place.\n\n` +
                            `🥂 **The Continental** — Meet the family ` +
                            `and make yourself at home.\n\n` +
                            `*By order of Don Bre, enjoy your stay.* 🗝️`;

                        const configuredWelcome =
                            welcomeConfig.welcomeMessage ||
                            welcomeConfig.welcomeEmbed?.description ||
                            defaultWelcome;

                        const welcomeMessage =
                            formatWelcomeMessage(
                                configuredWelcome,
                                formatData
                            );

                        const messageContent =
                            welcomeConfig.welcomePing
                                ? user.toString()
                                : null;

                        const canEmbed = permissions.has(
                            PermissionFlagsBits.EmbedLinks
                        );

                        if (!canEmbed) {
                            await channel.send({
                                content: [
                                    messageContent,
                                    welcomeMessage
                                ].filter(Boolean).join('\n\n'),
                                allowedMentions: {
                                    users: welcomeConfig.welcomePing
                                        ? [user.id]
                                        : []
                                }
                            });
                        } else {
                            // ========================================
                            // LUXURY GUEST CHECK-IN EMBED
                            // ========================================

                            const embed = new EmbedBuilder()
                                .setColor('#692F3A')
                                .setTitle(
                                    '🥀 THE B CONTINENTAL | GUEST CHECK-IN'
                                )
                                .setDescription(welcomeMessage)

                                // Member avatar only
                                .setThumbnail(
                                    user.displayAvatarURL({
                                        size: 256
                                    })
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

                            // No welcome banner or custom image.
                            // The member avatar remains visible.

                            await channel.send({
                                content: messageContent,
                                embeds: [embed],
                                allowedMentions: {
                                    users: welcomeConfig.welcomePing
                                        ? [user.id]
                                        : []
                                }
                            });
                        }

                    } catch (error) {
                        logger.error(
                            'Error sending Continental welcome:',
                            error
                        );
                    }
                }
            }

            // ========================================
            // AUTOMATIC ROLE ASSIGNMENT
            // ========================================

            if (
                welcomeConfig?.roleIds &&
                welcomeConfig.roleIds.length > 0
            ) {
                const delay =
                    welcomeConfig.autoRoleDelay || 0;

                const singleRoleId =
                    welcomeConfig.roleIds[0];

                if (delay > 0) {
                    const timeout = setTimeout(async () => {
                        const role =
                            guild.roles.cache.get(singleRoleId);

                        if (role) {
                            await assignRoleSafely(
                                member,
                                role
                            );
                        }
                    }, delay * 1000);

                    if (typeof timeout.unref === 'function') {
                        timeout.unref();
                    }
                } else {
                    const role =
                        guild.roles.cache.get(singleRoleId);

                    if (role) {
                        await assignRoleSafely(
                            member,
                            role
                        );
                    }
                }
            }

            // ========================================
            // MEMBER VERIFICATION
            // ========================================

            if (
                config?.verification?.enabled ||
                config?.verification?.autoVerify?.enabled
            ) {
                await handleVerification(
                    member,
                    guild,
                    config.verification,
                    member.client
                );
            }

            // ========================================
            // MEMBER JOIN LOGGING
            // ========================================

            try {
                await logEvent({
                    client: member.client,
                    guildId: guild.id,
                    eventType: EVENT_TYPES.MEMBER_JOIN,
                    data: {
                        title: 'User joined',
                        lines: [
                            `**User:** ${user.toString()} ` +
                            `(${user.displayName !== user.username
                                ? `@${user.displayName}`
                                : user.tag})`,

                            `**ID:** \`${user.id}\``,

                            `**Created:** <t:${Math.floor(
                                user.createdTimestamp / 1000
                            )}:R>`,

                            `**Members:** ${guild.memberCount}`
                        ],
                        quoted: false,
                        thumbnail: user.displayAvatarURL({
                            size: 256
                        }),
                        userId: user.id
                    }
                });

            } catch (error) {
                logger.debug(
                    'Error logging member join:',
                    error
                );
            }

            // ========================================
            // SERVER MEMBER COUNTERS
            // ========================================

            try {
                const counters = await getServerCounters(
                    member.client,
                    guild.id
                );

                for (const counter of counters) {
                    if (
                        counter &&
                        counter.type &&
                        counter.channelId &&
                        counter.enabled !== false
                    ) {
                        await updateCounter(
                            member.client,
                            guild,
                            counter
                        );
                    }
                }

            } catch (error) {
                logger.debug(
                    'Error updating counters on member join:',
                    error
                );
            }

            // ========================================
            // RESTORE SAVED BIRTHDAY
            // ========================================

            try {
                const backupKey =
                    `guild:${guild.id}:birthdays:left`;

                const backup =
                    (await member.client.db.get(backupKey)) || {};

                if (backup[user.id]) {
                    const { month, day } =
                        backup[user.id];

                    await dbSetBirthday(
                        member.client,
                        guild.id,
                        user.id,
                        month,
                        day
                    );

                    delete backup[user.id];

                    await member.client.db.set(
                        backupKey,
                        backup
                    );

                    logger.debug(
                        `Birthday restored for user ${user.id} ` +
                        `in guild ${guild.id}`
                    );
                }

            } catch (error) {
                logger.debug(
                    'Error restoring birthday on member join:',
                    error
                );
            }

        } catch (error) {
            logger.error(
                'Error in guildMemberAdd event:',
                error
            );
        }
    }
};

// ========================================
// MEMBER VERIFICATION HELPER
// ========================================

async function handleVerification(
    member,
    guild,
    verificationConfig,
    client
) {
    const { autoVerifyOnJoin } = await import(
        '../services/verificationService.js'
    );

    try {
        const result = await autoVerifyOnJoin(
            client,
            guild,
            member,
            verificationConfig
        );

        if (result.autoVerified) {
            logger.info(
                'User auto-verified on join',
                {
                    guildId: guild.id,
                    userId: member.id,
                    userTag: member.user.tag,
                    roleName: result.roleName,
                    criteria: result.criteria
                }
            );
        } else {
            logger.debug(
                'User not auto-verified on join',
                {
                    guildId: guild.id,
                    userId: member.id,
                    reason: result.reason
                }
            );
        }

    } catch (error) {
        logger.error(
            'Error in auto-verification for member',
            {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                error: error.message
            }
        );
    }
}

// ========================================
// SAFE ROLE ASSIGNMENT
// ========================================

async function assignRoleSafely(member, role) {
    try {
        await member.roles.add(role);

    } catch (error) {
        logger.warn(
            `Failed to assign role ${role.id} ` +
            `to member ${member.id}:`,
            error
        );
    }
}
