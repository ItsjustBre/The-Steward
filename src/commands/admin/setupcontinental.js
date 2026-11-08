import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';

const ROLE_ALIASES = {
  social: ['Social Club', 'Community & Conversations'],
  beauty: ['Beauty & Lifestyle'],
  gaming: ['Gaming', 'Gaming & Streams'],
  events: ['Events', 'Events & Game Nights'],
  anime: ['Weeb Tingz'],
  books: ['The Bookshelf'],
  movies: ['Movies & Shows'],
  fashion: ['Fashion & Looks'],
  capos: ['Capos'],
  staff: ['Consiglieres', 'Consigliere'],
  don: ['Don', 'Don Bre']
};

const PLAN = [
  {
    category: "Don's Office",
    channels: [
      ['family-orders', 'Official directives and announcements from Don Bre.', 'public', 'text', true],
      ['going-live', 'Twitch, YouTube, Kick, and TikTok live notifications.', 'public', 'text', true],
      ['the-paparazzi', 'Creator updates, new videos, and social media releases.', 'public', 'text', true],
      ['the-tribute', 'Giveaways, rewards, and special community announcements.', 'public', 'text', true]
    ]
  },
  {
    category: 'Grand Lounge',
    channels: [
      ['lounge-talk', 'The main gathering place for The Syndicate.', 'social'],
      ['introductions', 'Meet the family and introduce yourself.', 'social'],
      ['the-dining-room', 'Food, recipes, restaurants, and everyday conversations.', 'social'],
      ['the-concourse', null, 'social', 'voice']
    ]
  },
  {
    category: 'Bathhouse & Spa',
    channels: [
      ['the-apothecary', 'Makeup, skincare, and beauty recommendations.', 'beauty'],
      ['grwm-mirror', 'GRWM, transformations, and beauty looks.', 'beauty'],
      ['the-salon', 'Hair, self-care, and lifestyle discussions.', 'beauty'],
      ['the-bathhouse', null, 'beauty', 'voice']
    ]
  },
  {
    category: 'The Armory',
    channels: [
      ['the-armory', 'Gaming discussions, news, and updates.', 'gaming'],
      ['co-op-contracts', 'Find teammates and organize gaming sessions.', 'gaming'],
      ['kill-streaks', 'Gaming clips, highlights, and achievements.', 'gaming'],
      ['battlestations', 'Gaming setups, PCs, consoles, and technology.', 'gaming'],
      ['tactical-comms-1', null, 'gaming', 'voice'],
      ['tactical-comms-2', null, 'gaming', 'voice']
    ]
  },
  {
    category: 'The Archives',
    channels: [
      ['weeb-tingz', 'Anime, manga, and otaku culture.', 'anime'],
      ['the-bookshelf', 'Books, reading recommendations, and literary discussions.', 'books'],
      ['screening-room', 'Movies, television, and watch parties.', 'movies'],
      ['fashion-and-looks', 'Fashion, personal style, and outfits.', 'fashion']
    ]
  },
  {
    category: 'Club Continental',
    channels: [
      ['event-reservations', 'Upcoming events, reservations, and RSVPs.', 'events'],
      ['game-night', 'Community game nights and special events.', 'events'],
      ['the-guestbook', 'Share your experiences with The Syndicate.', 'events'],
      ['club-floor', null, 'events', 'voice']
    ]
  },
  {
    category: 'V.I.P Floor',
    channels: [
      ['capos-lounge', 'Private conversations for Continental Capos.', 'capos'],
      ['vip-reservations', 'Exclusive experiences and subscriber events.', 'capos'],
      ['private-suite', null, 'capos', 'voice']
    ]
  },
  {
    category: 'High Table',
    channels: [
      ['council-chambers', 'Private staff discussions.', 'staff'],
      ['staff-logs', 'Moderation records and internal reports.', 'staff'],
      ['staff-briefings', 'Staff announcements and assignments.', 'staff'],
      ['the-boardroom', null, 'staff', 'voice']
    ]
  }
];

const CATEGORY_ALIASES = {
  "Don's Office": ['donsoffice', 'donoffice'],
  'Grand Lounge': ['grandlounge'],
  'Bathhouse & Spa': ['bathhousespa'],
  'The Armory': ['thearmory', 'armory'],
  'The Archives': ['thearchives', 'archives'],
  'Club Continental': ['clubcontinental'],
  'V.I.P Floor': ['vipfloor'],
  'High Table': ['hightable']
};

function normalize(value = '') {
  const fancyUpper = '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅';
  const fancyLower = '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟';
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';

  let result = Array.from(String(value)).map(char => {
    const upperIndex = Array.from(fancyUpper).indexOf(char);
    if (upperIndex !== -1) return alphabet[upperIndex];

    const lowerIndex = Array.from(fancyLower).indexOf(char);
    if (lowerIndex !== -1) return alphabet[lowerIndex];

    return char;
  }).join('');

  return result
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function categoryMatches(actualName, expectedName) {
  const actual = normalize(actualName);
  const expected = normalize(expectedName);

  const aliases = CATEGORY_ALIASES[expectedName] || [];

  return actual === expected || aliases.includes(actual);
}

function findCategory(guild, name) {
  return guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildCategory &&
    normalize(channel.name) === normalize(name)
  );
}

function findCategory(guild, name) {
  return guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildCategory &&
    categoryMatches(channel.name, name)
  );
}


function findExisting(guild, category, name) {
  return guild.channels.cache.find(channel =>
    channel.parentId === category.id &&
    normalize(channel.name) === normalize(name)
  );
}

function buildPermissions(guild, access, readOnly = false) {
  const view = PermissionFlagsBits.ViewChannel;
  const send = PermissionFlagsBits.SendMessages;
  const connect = PermissionFlagsBits.Connect;
  const speak = PermissionFlagsBits.Speak;
  const manageMessages = PermissionFlagsBits.ManageMessages;
  const createThreads = PermissionFlagsBits.CreatePublicThreads;
  const createPrivateThreads = PermissionFlagsBits.CreatePrivateThreads;
  const sendThreads = PermissionFlagsBits.SendMessagesInThreads;

  const everyone = {
    id: guild.roles.everyone.id,
    deny: [
      send,
      connect,
      createThreads,
      createPrivateThreads,
      sendThreads
    ]
  };

  if (access === 'public') {
    everyone.allow = [view];
  } else {
    everyone.deny.push(view);
  }

  const overrides = [everyone];

  if (access !== 'public') {
    const role = findRole(guild, access);
    if (!role) return null;

    overrides.push({
      id: role.id,
      allow: readOnly
        ? [view]
        : [view, send, connect, speak, sendThreads]
    });
  }

  const staffRoles = [
    findRole(guild, 'don'),
    findRole(guild, 'staff')
  ].filter(Boolean);

  for (const role of staffRoles) {
    if (!overrides.some(item => item.id === role.id)) {
      overrides.push({
        id: role.id,
        allow: [
          view,
          send,
          connect,
          speak,
          manageMessages,
          createThreads,
          createPrivateThreads,
          sendThreads
        ]
      });
    }
  }

  return overrides;
}

function inspectGuild(guild) {
  const actions = [];
  const issues = [];

  for (const section of PLAN) {
    const category = findCategory(guild, section.category);

    if (!category) {
      issues.push(`Missing category: ${section.category}`);
      continue;
    }

    for (const [
      name,
      topic,
      access,
      kind = 'text',
      readOnly = false
    ] of section.channels) {
      if (findExisting(guild, category, name)) {
        actions.push({
          status: 'existing',
          categoryName: section.category,
          name
        });
        continue;
      }

      const overwrites = buildPermissions(guild, access, readOnly);

      if (!overwrites) {
        issues.push(`Missing ${access} role for ${name}`);
        continue;
      }

      actions.push({
        status: 'create',
        categoryName: section.category,
        name,
        topic,
        access,
        kind,
        readOnly
      });
    }
  }

  return { actions, issues };
}

const sessions = new Map();
const activeGuilds = new Set();
const SESSION_MS = 5 * 60 * 1000;

function summarize(items, limit = 10) {
  return items.slice(0, limit).map(item => `• ${item}`).join('\n') +
    (items.length > limit ? `\n• ...and ${items.length - limit} more` : '');
}

export default {
  data: new SlashCommandBuilder()
    .setName('setupcontinental')
    .setDescription('Safely configure The B Continental channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    if (
      !interaction.inGuild() ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: 'Only an administrator may authorize Continental setup.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    const guild = interaction.guild;

    if (activeGuilds.has(guild.id)) {
      return interaction.editReply(
        'A Continental setup is already running.'
      );
    }

    await Promise.all([
      guild.channels.fetch(),
      guild.roles.fetch()
    ]);

    const { actions, issues } = inspectGuild(guild);
    const pending = actions.filter(a => a.status === 'create');
    const existing = actions.filter(a => a.status === 'existing');

    const lines = PLAN.map(section => {
      const count = pending.filter(
        a => a.categoryName === section.category
      ).length;

      return `**${section.category}:** ${count} new`;
    });

    let description =
      `${lines.join('\n')}\n\n` +
      `**New channels:** ${pending.length}\n` +
      `**Already existing:** ${existing.length}\n` +
      `**Skipped:** ${issues.length}`;

    if (issues.length) {
      description += `\n\n**Attention required:**\n${summarize(issues)}`;
    }

    const embed = new EmbedBuilder()
      .setColor('#692F3A')
      .setTitle('🥀 THE B CONTINENTAL | SETUP PREVIEW')
      .setDescription(description.slice(0, 4000))
      .setFooter({
        text: 'No changes have been made. Confirmation expires in 5 minutes.'
      });

    if (!pending.length) {
      return interaction.editReply({
        embeds: [embed],
        content: 'No new channels are ready to create.'
      });
    }

    const nonce = interaction.id;
    const key = `${guild.id}:${interaction.user.id}`;

    sessions.set(key, {
      nonce,
      expires: Date.now() + SESSION_MS
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`continental:confirm:${nonce}`)
        .setLabel(`Create ${pending.length} Channels`)
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`continental:cancel:${nonce}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('continental:')) {
      return false;
    }

    const [, action, nonce] = interaction.customId.split(':');

    if (!['confirm', 'cancel'].includes(action)) {
      return false;
    }

    if (
      !interaction.inGuild() ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      await interaction.reply({
        content: 'Administrator access required.',
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const key = `${interaction.guildId}:${interaction.user.id}`;
    const session = sessions.get(key);

    if (
      !session ||
      session.nonce !== nonce ||
      Date.now() > session.expires
    ) {
      await interaction.reply({
        content: 'This confirmation has expired. Run /setupcontinental again.',
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    sessions.delete(key);

    if (action === 'cancel') {
      await interaction.update({
        content: 'Setup cancelled. No changes made.',
        embeds: [],
        components: []
      });
      return true;
    }

    const guild = interaction.guild;

    if (activeGuilds.has(guild.id)) {
      await interaction.update({
        content: 'A setup is already running.',
        embeds: [],
        components: []
      });
      return true;
    }

    activeGuilds.add(guild.id);

    await interaction.update({
      content: '🥀 The Steward is preparing The Continental...',
      embeds: [],
      components: []
    });

    try {
      const bot = await guild.members.fetchMe();

      if (!bot.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.editReply(
          'The Steward needs Manage Channels permission.'
        );
        return true;
      }

      await Promise.all([
        guild.channels.fetch(),
        guild.roles.fetch()
      ]);

      const { actions, issues } = inspectGuild(guild);

      let created = 0;
      let skipped = 0;
      const failures = [];

      for (const item of actions.filter(a => a.status === 'create')) {
        try {
          await guild.channels.fetch();
          await guild.roles.fetch();

          const category = findCategory(guild, item.categoryName);

          if (!category) {
            skipped++;
            continue;
          }

          if (findExisting(guild, category, item.name)) {
            skipped++;
            continue;
          }

          const overwrites = buildPermissions(
            guild,
            item.access,
            item.readOnly
          );

          if (!overwrites) {
            skipped++;
            failures.push(`${item.name}: required role missing`);
            continue;
          }

          const isVoice = item.kind === 'voice';

          await guild.channels.create({
            name: item.name,
            type: isVoice
              ? ChannelType.GuildVoice
              : ChannelType.GuildText,
            parent: category.id,
            ...(isVoice ? {} : { topic: item.topic }),
            permissionOverwrites: overwrites,
            reason: `Continental setup approved by ${interaction.user.tag}`
          });

          created++;
        } catch (error) {
          failures.push(`${item.name}: ${error.message}`);
        }
      }

      const allIssues = [...issues, ...failures];

      await interaction.editReply({
        content:
          `🥀 **THE CONTINENTAL SETUP IS COMPLETE**\n\n` +
          `**Created:** ${created}\n` +
          `**Skipped during creation:** ${skipped}\n` +
          `**Issues:** ${allIssues.length}\n\n` +
          `Existing channels were not edited or deleted.` +
          (allIssues.length
            ? `\n\n${summarize(allIssues)}`
            : '\n\nThe establishment is ready for inspection.')
      });

      return true;
    } catch (error) {
      console.error('[Continental Setup]', error);

      await interaction.editReply(
        'Setup encountered an error. Check The Steward logs. Some channels may have been created; rerunning will skip existing names.'
      );

      return true;
    } finally {
      activeGuilds.delete(guild.id);
    }
  }
};
