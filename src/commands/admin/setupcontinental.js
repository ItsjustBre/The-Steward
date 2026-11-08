import {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  EmbedBuilder
} from 'discord.js';

// Edit these aliases if your existing role names differ.
const ROLE_ALIASES = {
  social: ['Social Club', 'Community & Conversations', 'General Role'],
  beauty: ['Beauty & Lifestyle', 'Beauty Role'],
  gaming: ['Gaming', 'Gaming Role'],
  events: ['Events', 'Events Role'],
  anime: ['Weeb Tingz'], books: ['The Bookshelf'],
  movies: ['Movies & Shows'], fashion: ['Fashion & Looks'],
  capos: ['Capos'], staff: ['Consiglieres', 'Consigliere'],
  don: ['Don']
};

// Public channels are visible to everyone; interest channels are only visible
// to the matching opted-in roles. Staff and VIP channels fail closed.
const PLAN = [
  { category: "Don's Office", channels: [
    ['family-orders', 'Official directives, announcements, and family business from Don Bre.', 'public'],
    ['going-live', 'Official live stream alerts from The Steward.', 'public'],
    ['the-paparazzi', 'New videos, creator updates, and social media releases.', 'public'],
    ['the-tribute', 'Giveaways, community rewards, and special perks.', 'public']
  ]},
  { category: 'Grand Lounge', channels: [
    ['lounge-talk', 'The Continental’s main room for good company and conversation.', 'social'],
    ['introductions', 'Introduce yourself to the family and meet your fellow guests.', 'social'],
    ['the-dining-room', 'Recipes, food photography, restaurant talk, and late-night bites.', 'social'],
    ['the-concourse', null, 'social', 'voice']
  ]},
  { category: 'Bathhouse & Spa', channels: [
    ['the-apothecary', 'Beauty, skincare, makeup finds, and product reviews.', 'beauty'],
    ['grwm-mirror', 'Get-ready-with-me looks, outfits, and transformations.', 'beauty'],
    ['the-salon', 'Hair, wellness, and everyday lifestyle conversations.', 'beauty'],
    ['the-bathhouse', null, 'beauty', 'voice']
  ]},
  { category: 'The Armory', channels: [
    ['the-armory', 'Gaming, patch notes, builds, and general tech talk.', 'gaming'],
    ['co-op-contracts', 'Find a squad, organize co-op sessions, and team up.', 'gaming'],
    ['kill-streaks', 'Clips, highlights, victories, and unforgettable moments.', 'gaming'],
    ['battlestations', 'Showcase PCs, consoles, desks, and gaming setups.', 'gaming'],
    ['tactical-comms-1', null, 'gaming', 'voice'],
    ['tactical-comms-2', null, 'gaming', 'voice']
  ]},
  { category: 'The Archives', channels: [
    ['weeb-tingz', 'Anime, manga, cosplay, and otaku culture.', 'anime'],
    ['the-bookshelf', 'Book clubs, recommendations, and literary obsessions.', 'books'],
    ['screening-room', 'Movies, television, reviews, and watch-party talk.', 'movies'],
    ['fashion-and-looks', 'Fashion inspiration, personal style, and outfit showcases.', 'fashion']
  ]},
  { category: 'Club Continental', channels: [
    ['event-reservations', 'Event schedules, RSVPs, and upcoming gatherings.', 'events'],
    ['game-night', 'Community game nights, matchups, and event discussion.', 'events'],
    ['the-guestbook', 'Leave your mark and share a message with the family.', 'events'],
    ['club-floor', null, 'events', 'voice']
  ]},
  { category: 'V.I.P Floor', channels: [
    ['capos-lounge', 'The private lounge for Continental Capos.', 'capos'],
    ['vip-reservations', 'VIP experiences, private events, and special access.', 'capos'],
    ['private-suite', null, 'capos', 'voice']
  ]},
  { category: 'High Table', channels: [
    ['council-chambers', 'Private staff discussion and council business.', 'staff'],
    ['staff-logs', 'Staff-only incident records and operational notes.', 'staff'],
    ['staff-briefings', 'Moderation planning, assignments, and coordination.', 'staff'],
    ['the-boardroom', null, 'staff', 'voice']
  ]}
];

const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const findCategory = (guild, name) => guild.channels.cache.find(c =>
  c.type === ChannelType.GuildCategory && normalize(c.name) === normalize(name)
);
const findRole = (guild, key) => {
  const names = ROLE_ALIASES[key] || [];
  return guild.roles.cache.find(r => names.some(n => normalize(r.name) === normalize(n))) || null;
};
const findExisting = (guild, parent, name) => guild.channels.cache.find(c =>
  c.parentId === parent.id && normalize(c.name) === normalize(name)
);

function permissions(guild, access) {
  const everyone = guild.roles.everyone.id;
  const view = PermissionFlagsBits.ViewChannel;
  const send = PermissionFlagsBits.SendMessages;
  const connect = PermissionFlagsBits.Connect;
  const overrides = [{ id: everyone, deny: [send] }];
  if (access !== 'public') overrides[0].deny.push(view, connect);
  else overrides[0].allow = [view];

  // Allow The Steward to publish in official announcement channels.
  if (guild.members.me) overrides.push({ id: guild.members.me.id, allow: [view, send, connect] });

  const required = findRole(guild, access);
  if (access !== 'public' && !required) return null;
  if (required) overrides.push({ id: required.id, allow: [view, send, connect] });

  // The Don and Consiglieres can administer interest channels.
  // High Table remains staff-only, with Don also permitted.
  for (const key of ['don', 'staff']) {
    const role = findRole(guild, key);
    if (role && !overrides.some(o => o.id === role.id)) {
      overrides.push({ id: role.id, allow: [view, send, connect] });
    }
  }
  return overrides;
}

function inspect(guild) {
  const actions = [];
  const issues = [];
  for (const section of PLAN) {
    const category = findCategory(guild, section.category);
    if (!category) {
      issues.push(`Missing category: ${section.category}`);
      continue;
    }
    for (const [name, topic, access, kind] of section.channels) {
      const existing = findExisting(guild, category, name);
      if (existing) {
        actions.push({ status: 'existing', category, name });
        continue;
      }
      const overwrites = permissions(guild, access);
      if (!overwrites) {
        issues.push(`Missing role for #${name}: ${access} (${(ROLE_ALIASES[access] || []).join(' / ')})`);
        continue;
      }
      actions.push({ status: 'create', category, name, topic, access, kind, overwrites });
    }
  }
  return { actions, issues };
}

const sessions = new Map();
const SESSION_MS = 5 * 60 * 1000;
const MAX_ISSUES_SHOWN = 12;

export default {
  data: new SlashCommandBuilder()
    .setName('setupcontinental')
    .setDescription('Preview and safely create The B Continental channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Administrator access required.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild;
    await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);
    const { actions, issues } = inspect(guild);
    const create = actions.filter(a => a.status === 'create');
    const existing = actions.filter(a => a.status === 'existing');
    const summary = PLAN.map(s => {
      const count = create.filter(a => a.category.name === findCategory(guild, s.category)?.name).length;
      return `**${s.category}** — ${count} new`;
    }).join('\n');
    const details = issues.length ? `\n**Needs attention (${issues.length}):**\n${issues.slice(0, MAX_ISSUES_SHOWN).map(s => `• ${s}`).join('\n')}${issues.length > MAX_ISSUES_SHOWN ? '\n• …and more' : ''}` : '';
    const embed = new EmbedBuilder()
      .setColor('#692F3A')
      .setTitle('🥀 The Continental — Setup Preview')
      .setDescription(`${summary}\n\n**Create:** ${create.length} · **Already present:** ${existing.length} · **Skipped:** ${issues.length}${details}`.slice(0, 4000))
      .setFooter({ text: 'Nothing has changed yet. Confirmation expires in 5 minutes.' });

    if (!create.length) return interaction.editReply({ embeds: [embed], content: 'No new channels can be created with the current configuration.' });
    const key = `${guild.id}:${interaction.user.id}`;
    const nonce = interaction.id;
    sessions.set(key, { nonce, expires: Date.now() + SESSION_MS });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`continental:confirm:${nonce}`).setLabel(`Create ${create.length} channels`).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`continental:cancel:${nonce}`).setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('continental:')) return false;
    const [prefix, action, nonce] = interaction.customId.split(':');
    if (prefix !== 'continental') return false;
    const key = `${interaction.guildId}:${interaction.user.id}`;
    const session = sessions.get(key);
    if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
        !session || session.nonce !== nonce || Date.now() > session.expires) {
      await interaction.reply({ content: 'This setup confirmation is invalid or expired. Run /setupcontinental again.', flags: MessageFlags.Ephemeral });
      return true;
    }
    sessions.delete(key);
    if (action === 'cancel') {
      await interaction.update({ content: 'Setup cancelled. No changes made.', embeds: [], components: [] });
      return true;
    }
    if (action !== 'confirm') return false;
    await interaction.update({ content: 'The Steward is preparing the Continental…', embeds: [], components: [] });
    const guild = interaction.guild;
    const bot = await guild.members.fetchMe();
    if (!bot.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply('The Steward needs **Manage Channels** permission. No channels created.');
      return true;
    }
    await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);
    const { actions, issues } = inspect(guild);
    let created = 0;
    const failures = [];
    for (const item of actions.filter(a => a.status === 'create')) {
      try {
        // Re-check before every creation to avoid duplicates during a long run.
        await guild.channels.fetch();
        const category = findCategory(guild, item.category.name);
        if (!category || findExisting(guild, category, item.name)) continue;
        const overwrites = permissions(guild, item.access);
        if (!overwrites) { failures.push(`${item.name}: missing access role`); continue; }
        const isVoice = item.kind === 'voice';
        await guild.channels.create({
          name: item.name,
          type: isVoice ? ChannelType.GuildVoice : ChannelType.GuildText,
          parent: category.id,
          ...(isVoice ? {} : { topic: item.topic }),
          permissionOverwrites: overwrites,
          reason: `The B Continental setup approved by ${interaction.user.tag}`
        });
        created++;
      } catch (error) {
        failures.push(`${item.name}: ${error.message}`);
      }
    }
    const errors = [...issues, ...failures];
    await interaction.editReply(
      `🥀 **Continental setup complete.**\nCreated: **${created}** channel(s).\nSkipped/failed: **${errors.length}**.\nExisting channels were not edited or deleted.` +
      (errors.length ? `\n\n${errors.slice(0, 12).map(e => `• ${e}`).join('\n')}` : '')
    );
    return true;
  }
};
