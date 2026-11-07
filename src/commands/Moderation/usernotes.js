import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';

import {
    successEmbed,
    infoEmbed
} from '../../utils/embeds.js';

import { logger } from '../../utils/logger.js';
import {
    getFromDb,
    setInDb,
    getUserNotesKey
} from '../../utils/database.js';

import { sanitizeInput } from '../../utils/validation.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { replyUserError, ErrorTypes } from '../../utils/errorHandler.js';

const PRIVATE = { flags: MessageFlags.Ephemeral };

export default {
    data: new SlashCommandBuilder()
        .setName('usernotes')
        .setDescription('Manage confidential Continental guest records.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false)

        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an internal note to a guest record.')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('Guest to document.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('note')
                        .setDescription('Internal observation or incident details.')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Classification of the guest note.')
                        .addChoices(
                            { name: 'Disciplinary Concern', value: 'warning' },
                            { name: 'Positive Recognition', value: 'positive' },
                            { name: 'General Observation', value: 'neutral' },
                            { name: 'Security Alert', value: 'alert' }
                        )
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Review internal notes for a guest.')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('Guest whose notes will be reviewed.')
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove one note from a guest record.')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('Guest whose note will be removed.')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('index')
                        .setDescription('Note number shown in /usernotes view.')
                        .setMinValue(1)
                        .setRequired(true)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all internal notes for a guest.')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('Guest whose notes will be cleared.')
                        .setRequired(true)
                )
        ),

    category: 'moderation',

    async execute(interaction, config, client) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const targetUser = interaction.options.getUser('target');

            if (!targetUser) {
                return await replyUserError(interaction, {
                    type: ErrorTypes.VALIDATION,
                    message: 'Please identify a Continental guest.'
                });
            }

            const guildId = interaction.guildId;
            const notesKey = getUserNotesKey(guildId, targetUser.id);
            const notes = await getFromDb(notesKey, []);

            if (!Array.isArray(notes)) {
                throw new Error('Invalid guest notes data.');
            }

            switch (subcommand) {
                case 'add':
                    return await handleAddNote(
                        interaction, targetUser, notes, notesKey
                    );

                case 'view':
                    return await handleViewNotes(
                        interaction, targetUser, notes
                    );

                case 'remove':
                    return await handleRemoveNote(
                        interaction, targetUser, notes, notesKey
                    );

                case 'clear':
                    return await handleClearNotes(
                        interaction, targetUser, notes, notesKey
                    );

                default:
                    return await replyUserError(interaction, {
                        type: ErrorTypes.VALIDATION,
                        message: 'Please select a valid guest records action.'
                    });
            }
        } catch (error) {
            logger.error('Steward usernotes error:', error);

            return await replyUserError(interaction, {
                type: ErrorTypes.UNKNOWN,
                message: 'The Steward could not process the guest records request.'
            });
        }
    }
};

async function handleAddNote(interaction, targetUser, notes, notesKey) {
    const rawNote = interaction.options.getString('note')?.trim() || '';
    const type = interaction.options.getString('type') || 'neutral';

    if (!rawNote || rawNote.length > 1000) {
        return await replyUserError(interaction, {
            type: ErrorTypes.VALIDATION,
            message: 'Notes must contain between 1 and 1000 characters.'
        });
    }

    const note = sanitizeInput(rawNote);

    const noteData = {
        id: Date.now(),
        content: note,
        type,
        author: interaction.user.tag,
        authorId: interaction.user.id,
        timestamp: new Date().toISOString()
    };

    notes.push(noteData);
    await setInDb(notesKey, notes);

    const typeInfo = getNoteTypeInfo(type);

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            successEmbed(
                `${typeInfo.emoji} THE STEWARD | GUEST NOTE FILED`,
                [
                    '**THE B CONTINENTAL — GUEST RECORDS**',
                    '',
                    `**Guest:** ${targetUser.tag}`,
                    `**Classification:** ${typeInfo.label}`,
                    `**Observation:** ${note}`,
                    `**Filed By:** ${interaction.user.tag}`,
                    `**Total Notes:** ${notes.length}`,
                    '',
                    '*This entry has been saved to the internal guest record.*'
                ].join('\n')
            )
        ],
        ...PRIVATE
    });
}

async function handleViewNotes(interaction, targetUser, notes) {
    if (notes.length === 0) {
        return InteractionHelper.safeReply(interaction, {
            embeds: [
                infoEmbed(
                    '📂 THE STEWARD | GUEST RECORDS',
                    `No internal notes are recorded for **${targetUser.tag}**.`
                )
            ],
            ...PRIVATE
        });
    }

    const sortedNotes = [...notes].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    let description = [
        '**THE B CONTINENTAL — CONFIDENTIAL GUEST FILE**',
        '',
        `**Guest:** ${targetUser.tag}`,
        `**Total Notes:** ${notes.length}`,
        '',
    ].join('\n');

    sortedNotes.forEach((note, index) => {
        const typeInfo = getNoteTypeInfo(note.type);
        const date = new Date(note.timestamp).toLocaleDateString();

        description += [
            `${typeInfo.emoji} **Note #${index + 1} — ${typeInfo.label}**`,
            `**Date:** ${date}`,
            `**Filed By:** ${note.author}`,
            `**Observation:** ${note.content}`,
            ''
        ].join('\n') + '\n';
    });

    if (description.length > 3900) {
        description = description.slice(0, 3900) +
            '\n\n*Additional records are not displayed.*';
    }

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            infoEmbed(
                '📂 THE STEWARD | CONFIDENTIAL GUEST FILE',
                description
            )
        ],
        ...PRIVATE
    });
}

async function handleRemoveNote(interaction, targetUser, notes, notesKey) {
    const index = interaction.options.getInteger('index') - 1;

    if (index < 0 || index >= notes.length) {
        return await replyUserError(interaction, {
            type: ErrorTypes.VALIDATION,
            message: `Select a valid note number (1-${notes.length}).`
        });
    }

    const sortedNotes = [...notes].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    const removedNote = sortedNotes[index];
    const originalIndex = notes.indexOf(removedNote);

    notes.splice(originalIndex, 1);
    await setInDb(notesKey, notes);

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            successEmbed(
                '🗑️ THE STEWARD | GUEST NOTE REMOVED',
                [
                    '**THE B CONTINENTAL — GUEST RECORDS**',
                    '',
                    `**Guest:** ${targetUser.tag}`,
                    `**Removed Note:** #${index + 1}`,
                    `**Remaining Notes:** ${notes.length}`,
                    '',
                    '*The selected entry has been removed from the guest file.*'
                ].join('\n')
            )
        ],
        ...PRIVATE
    });
}

async function handleClearNotes(interaction, targetUser, notes, notesKey) {
    if (notes.length === 0) {
        return InteractionHelper.safeReply(interaction, {
            embeds: [
                infoEmbed(
                    '📂 THE STEWARD | NO RECORDS TO CLEAR',
                    `There are no internal notes for **${targetUser.tag}**.`
                )
            ],
            ...PRIVATE
        });
    }

    const noteCount = notes.length;

    await setInDb(notesKey, []);

    return InteractionHelper.safeReply(interaction, {
        embeds: [
            successEmbed(
                '🗑️ THE STEWARD | GUEST FILE CLEARED',
                [
                    '**THE B CONTINENTAL — GUEST RECORDS**',
                    '',
                    `**Guest:** ${targetUser.tag}`,
                    `**Records Removed:** ${noteCount}`,
                    '',
                    '*All internal notes for this guest have been cleared.*'
                ].join('\n')
            )
        ],
        ...PRIVATE
    });
}

function getNoteTypeInfo(type) {
    const types = {
        warning: {
            emoji: '⚠️',
            label: 'Disciplinary Concern'
        },
        positive: {
            emoji: '✅',
            label: 'Positive Recognition'
        },
        neutral: {
            emoji: '📝',
            label: 'General Observation'
        },
        alert: {
            emoji: '🚨',
            label: 'Security Alert'
        }
    };

    return types[type] || types.neutral;
}
